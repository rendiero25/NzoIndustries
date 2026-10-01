-- ============================================================
-- NZO Industries — 09 orders, payments, shipments
-- Pesanan dibuat server (service role) setelah total dihitung ulang dari DB
-- (security rule 4). Customer hanya membaca pesanan miliknya.
-- ============================================================

create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      text not null unique,
  user_id           uuid not null references public.profiles (id) on delete restrict,
  status            public.order_status not null default 'pending_payment',
  subtotal          bigint not null,
  shipping_cost     bigint not null default 0,
  discount_total    bigint not null default 0,
  unique_code       smallint not null default 0,
  grand_total       bigint not null,
  voucher_id        uuid references public.vouchers (id) on delete set null,
  payment_provider  public.payment_provider,
  shipping_address  jsonb not null,
  customer_note     text,
  payment_due_at    timestamptz,
  paid_at           timestamptz,
  cancelled_at      timestamptz,
  cancel_reason     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint orders_amounts_non_negative check (
    subtotal >= 0 and shipping_cost >= 0 and discount_total >= 0 and grand_total >= 0
  ),
  constraint orders_unique_code_range check (unique_code between 0 and 999),
  constraint orders_grand_total_formula check (
    grand_total = subtotal + shipping_cost - discount_total + unique_code
  ),
  constraint orders_address_object check (jsonb_typeof(shipping_address) = 'object'),
  constraint orders_note_len check (customer_note is null or char_length(customer_note) <= 500)
);

create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_payment_due_idx on public.orders (payment_due_at) where status = 'pending_payment';

-- order_number: NZO-YYMMDD-XXXXXX (6 heks acak, uppercase); dibuat bila kosong.
create or replace function public.orders_set_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := 'NZO-' || to_char(now() at time zone 'Asia/Jakarta', 'YYMMDD') || '-'
      || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  end if;
  return new;
end;
$$;

create trigger orders_number
  before insert on public.orders
  for each row execute function public.orders_set_number();

create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  product_id    uuid references public.products (id) on delete set null,
  variant_id    uuid references public.product_variants (id) on delete set null,
  product_name  text not null,
  variant_name  text,
  sku           text not null,
  unit_price    bigint not null,
  quantity      integer not null,
  line_total    bigint not null,
  weight_grams  integer,
  created_at    timestamptz not null default now(),
  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_price_non_negative check (unit_price >= 0),
  constraint order_items_line_total check (line_total = unit_price * quantity)
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_status_history (
  id           bigint generated always as identity primary key,
  order_id     uuid not null references public.orders (id) on delete cascade,
  from_status  public.order_status,
  to_status    public.order_status not null,
  changed_by   uuid references public.profiles (id) on delete set null,
  note         text,
  created_at   timestamptz not null default now()
);

create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

-- Snapshot riwayat status otomatis saat insert / perubahan status.
create or replace function public.orders_log_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by, note)
    values (
      new.id,
      case when tg_op = 'UPDATE' then old.status end,
      new.status,
      (select auth.uid()),
      nullif(current_setting('nzo.status_note', true), '')
    );
  end if;
  return new;
end;
$$;

create trigger orders_status_history
  after insert or update of status on public.orders
  for each row execute function public.orders_log_status();

create trigger order_status_history_append_only
  before update or delete on public.order_status_history
  for each row execute function public.reject_mutation();

create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  provider      public.payment_provider not null,
  provider_ref  text,
  status        public.payment_status not null default 'pending',
  amount        bigint not null,
  checkout_url  text,
  expires_at    timestamptz,
  paid_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint payments_amount_non_negative check (amount >= 0),
  constraint payments_provider_ref_unique unique (provider, provider_ref)
);

create index payments_order_idx on public.payments (order_id);
create index payments_pending_expiry_idx on public.payments (expires_at) where status = 'pending';

create table public.payment_proofs (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  payment_id     uuid references public.payments (id) on delete set null,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  storage_path   text not null unique,
  mime_type      text not null,
  size_bytes     integer not null,
  status         public.proof_status not null default 'pending',
  reviewed_by    uuid references public.profiles (id) on delete set null,
  reviewed_at    timestamptz,
  reject_reason  text,
  created_at     timestamptz not null default now(),
  constraint payment_proofs_mime check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  constraint payment_proofs_size check (size_bytes between 1 and 5242880),
  constraint payment_proofs_path_owner check (storage_path like user_id::text || '/%'),
  constraint payment_proofs_reject_reason check (status <> 'rejected' or reject_reason is not null)
);

create index payment_proofs_order_idx on public.payment_proofs (order_id);
create index payment_proofs_pending_idx on public.payment_proofs (created_at) where status = 'pending';

create table public.shipments (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null unique references public.orders (id) on delete cascade,
  courier_code       text not null,
  courier_service    text not null,
  waybill_number     text,
  biteship_order_id  text unique,
  status             public.shipment_status not null default 'pending',
  cost               bigint not null default 0,
  shipped_at         timestamptz,
  delivered_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint shipments_cost_non_negative check (cost >= 0)
);

create index shipments_waybill_idx on public.shipments (waybill_number);

create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger shipments_set_updated_at before update on public.shipments
  for each row execute function public.set_updated_at();

create or replace function public.owns_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o where o.id = p_order_id and o.user_id = (select auth.uid())
  );
$$;

-- stock_reservations & voucher_redemptions mengacu ke orders.
alter table public.stock_reservations
  add constraint stock_reservations_order_fk foreign key (order_id) references public.orders (id) on delete cascade;
alter table public.voucher_redemptions
  add constraint voucher_redemptions_order_fk foreign key (order_id) references public.orders (id) on delete cascade;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.shipments enable row level security;

create policy orders_select_own on public.orders
  for select to authenticated using (user_id = (select auth.uid()));
create policy orders_select_staff on public.orders
  for select to authenticated using ((select public.is_staff()));
create policy orders_update_staff on public.orders
  for update to authenticated
  using ((select public.has_role(array['owner', 'admin', 'warehouse']::public.app_role[])))
  with check ((select public.has_role(array['owner', 'admin', 'warehouse']::public.app_role[])));

create policy order_items_select_own on public.order_items
  for select to authenticated using (public.owns_order(order_id));
create policy order_items_select_staff on public.order_items
  for select to authenticated using ((select public.is_staff()));

create policy order_status_history_select_own on public.order_status_history
  for select to authenticated using (public.owns_order(order_id));
create policy order_status_history_select_staff on public.order_status_history
  for select to authenticated using ((select public.is_staff()));

create policy payments_select_own on public.payments
  for select to authenticated using (public.owns_order(order_id));
create policy payments_select_staff on public.payments
  for select to authenticated
  using ((select public.has_role(array['owner', 'admin', 'cs']::public.app_role[])));

create policy payment_proofs_select_own on public.payment_proofs
  for select to authenticated using (user_id = (select auth.uid()));
create policy payment_proofs_insert_own on public.payment_proofs
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.owns_order(order_id)
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
  );
create policy payment_proofs_select_staff on public.payment_proofs
  for select to authenticated
  using ((select public.has_role(array['owner', 'admin', 'cs']::public.app_role[])));
create policy payment_proofs_review_staff on public.payment_proofs
  for update to authenticated
  using ((select public.has_role(array['owner', 'admin']::public.app_role[])))
  with check ((select public.has_role(array['owner', 'admin']::public.app_role[])));

create policy shipments_select_own on public.shipments
  for select to authenticated using (public.owns_order(order_id));
create policy shipments_select_staff on public.shipments
  for select to authenticated using ((select public.is_staff()));
create policy shipments_write_staff on public.shipments
  for all to authenticated
  using ((select public.has_role(array['owner', 'admin', 'warehouse']::public.app_role[])))
  with check ((select public.has_role(array['owner', 'admin', 'warehouse']::public.app_role[])));
