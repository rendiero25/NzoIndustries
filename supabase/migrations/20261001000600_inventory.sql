-- ============================================================
-- NZO Industries — 06 inventory ledger & reservations
-- inventory_movements adalah sumber kebenaran stok (append-only).
-- products.stock / product_variants.stock = cache, diperbarui trigger.
-- Produk dengan varian: stok dicatat per varian (variant_id wajib).
-- ============================================================

create table public.inventory_movements (
  id              bigint generated always as identity primary key,
  product_id      uuid not null references public.products (id) on delete restrict,
  variant_id      uuid references public.product_variants (id) on delete restrict,
  quantity        integer not null,
  type            public.inventory_movement_type not null,
  reason          text,
  reference_type  text,
  reference_id    uuid,
  created_by      uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  constraint inventory_movements_quantity_nonzero check (quantity <> 0),
  constraint inventory_movements_reason_required check (
    type not in ('adjustment', 'correction') or (reason is not null and char_length(trim(reason)) >= 3)
  )
);

create index inventory_movements_product_idx on public.inventory_movements (product_id, created_at desc);
create index inventory_movements_variant_idx on public.inventory_movements (variant_id, created_at desc);
create index inventory_movements_reference_idx on public.inventory_movements (reference_type, reference_id);

-- Terapkan delta ke cache stok; tolak bila hasil negatif atau varian salah produk.
create or replace function public.apply_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  has_variants boolean;
  new_stock integer;
begin
  select exists (select 1 from public.product_variants v where v.product_id = new.product_id)
    into has_variants;

  if new.variant_id is not null then
    if not exists (
      select 1 from public.product_variants v
      where v.id = new.variant_id and v.product_id = new.product_id
    ) then
      raise exception 'variant tidak sesuai produk' using errcode = '23514';
    end if;
  elsif has_variants then
    raise exception 'produk bervarian wajib menyertakan variant_id' using errcode = '23514';
  end if;

  perform set_config('nzo.cache_write', 'on', true);

  if new.variant_id is not null then
    update public.product_variants
      set stock = stock + new.quantity
      where id = new.variant_id
      returning stock into new_stock;
    -- stok produk = total stok varian
    update public.products p
      set stock = (select coalesce(sum(v.stock), 0) from public.product_variants v where v.product_id = p.id)
      where p.id = new.product_id;
  else
    update public.products
      set stock = stock + new.quantity
      where id = new.product_id
      returning stock into new_stock;
  end if;

  perform set_config('nzo.cache_write', 'off', true);

  if new_stock < 0 then
    raise exception 'stok tidak cukup' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger inventory_movements_apply
  after insert on public.inventory_movements
  for each row execute function public.apply_inventory_movement();

-- Append-only: tolak update & delete (termasuk dari staf).
create or replace function public.reject_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% bersifat append-only', tg_table_name using errcode = '42501';
end;
$$;

create trigger inventory_movements_no_update
  before update or delete on public.inventory_movements
  for each row execute function public.reject_mutation();

alter table public.inventory_movements enable row level security;

create policy inventory_movements_select_staff on public.inventory_movements
  for select to authenticated
  using ((select public.is_staff()));

create policy inventory_movements_insert_stock_roles on public.inventory_movements
  for insert to authenticated
  with check (
    (select public.has_role(array['owner', 'admin', 'warehouse']::public.app_role[]))
    and created_by = (select auth.uid())
  );

-- ------------------------------------------------------------
-- stock_reservations: dibuat saat pesanan dibuat (Fase 5), via server.
-- ------------------------------------------------------------
create table public.stock_reservations (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null,
  product_id  uuid not null references public.products (id) on delete restrict,
  variant_id  uuid references public.product_variants (id) on delete restrict,
  quantity    integer not null,
  status      public.reservation_status not null default 'active',
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint stock_reservations_quantity_positive check (quantity > 0)
);

create index stock_reservations_active_idx on public.stock_reservations (product_id, variant_id)
  where status = 'active';
create index stock_reservations_order_idx on public.stock_reservations (order_id);
create index stock_reservations_expiry_idx on public.stock_reservations (expires_at) where status = 'active';

create trigger stock_reservations_set_updated_at before update on public.stock_reservations
  for each row execute function public.set_updated_at();

alter table public.stock_reservations enable row level security;

-- Ditulis server (service role) saat checkout/cron; staf hanya baca.
create policy stock_reservations_select_staff on public.stock_reservations
  for select to authenticated
  using ((select public.is_staff()));
