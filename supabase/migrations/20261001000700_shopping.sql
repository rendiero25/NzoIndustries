-- ============================================================
-- NZO Industries — 07 carts & wishlists
-- Keranjang guest di Zustand; disinkron ke carts saat login (Fase 5).
-- ============================================================

create table public.carts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  cart_id     uuid not null references public.carts (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  variant_id  uuid references public.product_variants (id) on delete cascade,
  quantity    integer not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint cart_items_quantity_range check (quantity between 1 and 999),
  constraint cart_items_unique unique nulls not distinct (cart_id, product_id, variant_id)
);

create index cart_items_cart_idx on public.cart_items (cart_id);
create index cart_items_product_idx on public.cart_items (product_id);

create table public.wishlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint wishlists_unique unique (user_id, product_id)
);

create index wishlists_product_idx on public.wishlists (product_id);

create trigger carts_set_updated_at before update on public.carts
  for each row execute function public.set_updated_at();
create trigger cart_items_set_updated_at before update on public.cart_items
  for each row execute function public.set_updated_at();

create or replace function public.owns_cart(p_cart_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.carts c where c.id = p_cart_id and c.user_id = (select auth.uid())
  );
$$;

alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.wishlists enable row level security;

create policy carts_own_all on public.carts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy cart_items_own_all on public.cart_items
  for all to authenticated
  using (public.owns_cart(cart_id))
  with check (public.owns_cart(cart_id) and public.is_product_visible(product_id));

create policy wishlists_own_all on public.wishlists
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.is_product_visible(product_id));
