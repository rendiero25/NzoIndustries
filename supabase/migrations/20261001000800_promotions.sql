-- ============================================================
-- NZO Industries — 08 vouchers, flash sales, banners
-- Validasi & perhitungan diskon selalu di server (security rule 4).
-- ============================================================

create table public.vouchers (
  id               uuid primary key default gen_random_uuid(),
  code             extensions.citext not null unique,
  description      text,
  discount_type    public.discount_type not null,
  discount_value   bigint not null,
  max_discount     bigint,
  min_subtotal     bigint not null default 0,
  usage_limit      integer,
  per_user_limit   integer not null default 1,
  used_count       integer not null default 0,
  starts_at        timestamptz,
  ends_at          timestamptz,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint vouchers_code_format check (code ~ '^[A-Za-z0-9_-]{3,32}$'),
  constraint vouchers_value_positive check (discount_value > 0),
  constraint vouchers_percent_max check (discount_type <> 'percent' or discount_value <= 100),
  constraint vouchers_max_discount_positive check (max_discount is null or max_discount > 0),
  constraint vouchers_min_subtotal_non_negative check (min_subtotal >= 0),
  constraint vouchers_limits_positive check (
    (usage_limit is null or usage_limit > 0) and per_user_limit > 0 and used_count >= 0
  ),
  constraint vouchers_period check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.voucher_redemptions (
  id               uuid primary key default gen_random_uuid(),
  voucher_id       uuid not null references public.vouchers (id) on delete restrict,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  order_id         uuid not null,
  discount_amount  bigint not null,
  created_at       timestamptz not null default now(),
  constraint voucher_redemptions_amount_non_negative check (discount_amount >= 0),
  constraint voucher_redemptions_order_unique unique (voucher_id, order_id)
);

create index voucher_redemptions_user_idx on public.voucher_redemptions (voucher_id, user_id);

create table public.flash_sales (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  subtitle    text,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint flash_sales_period check (ends_at > starts_at)
);

create index flash_sales_active_idx on public.flash_sales (starts_at, ends_at) where is_active;

create table public.flash_sale_items (
  id             uuid primary key default gen_random_uuid(),
  flash_sale_id  uuid not null references public.flash_sales (id) on delete cascade,
  product_id     uuid not null references public.products (id) on delete cascade,
  variant_id     uuid references public.product_variants (id) on delete cascade,
  sale_price     bigint not null,
  quota          integer,
  sold           integer not null default 0,
  sort_order     integer not null default 0,
  constraint flash_sale_items_price_non_negative check (sale_price >= 0),
  constraint flash_sale_items_quota check (quota is null or quota > 0),
  constraint flash_sale_items_sold check (sold >= 0 and (quota is null or sold <= quota)),
  constraint flash_sale_items_unique unique nulls not distinct (flash_sale_id, product_id, variant_id)
);

create index flash_sale_items_product_idx on public.flash_sale_items (product_id);

create table public.banners (
  id                      uuid primary key default gen_random_uuid(),
  placement               text not null default 'hero',
  title                   text,
  subtitle                text,
  image_public_id         text not null,
  mobile_image_public_id  text,
  link_url                text,
  sort_order              integer not null default 0,
  starts_at               timestamptz,
  ends_at                 timestamptz,
  is_active               boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint banners_placement check (placement in ('hero', 'promo', 'promo_bar', 'category')),
  constraint banners_images_nzo check (
    image_public_id like 'nzo/%' and (mobile_image_public_id is null or mobile_image_public_id like 'nzo/%')
  ),
  constraint banners_link_safe check (link_url is null or link_url ~ '^(/|https://)'),
  constraint banners_period check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index banners_placement_idx on public.banners (placement, sort_order) where is_active;

create trigger vouchers_set_updated_at before update on public.vouchers
  for each row execute function public.set_updated_at();
create trigger flash_sales_set_updated_at before update on public.flash_sales
  for each row execute function public.set_updated_at();
create trigger banners_set_updated_at before update on public.banners
  for each row execute function public.set_updated_at();

alter table public.vouchers enable row level security;
alter table public.voucher_redemptions enable row level security;
alter table public.flash_sales enable row level security;
alter table public.flash_sale_items enable row level security;
alter table public.banners enable row level security;

-- Voucher tidak bisa di-list publik (mencegah enumerasi kode). Validasi lewat server.
create policy vouchers_select_staff on public.vouchers
  for select to authenticated using ((select public.is_staff()));
create policy vouchers_write on public.vouchers
  for all to authenticated
  using ((select public.has_role(array['owner', 'admin']::public.app_role[])))
  with check ((select public.has_role(array['owner', 'admin']::public.app_role[])));

create policy voucher_redemptions_select_own on public.voucher_redemptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy voucher_redemptions_select_staff on public.voucher_redemptions
  for select to authenticated using ((select public.is_staff()));

create policy flash_sales_select on public.flash_sales
  for select to anon, authenticated using (is_active or (select public.is_staff()));
create policy flash_sales_write on public.flash_sales
  for all to authenticated
  using ((select public.has_role(array['owner', 'admin']::public.app_role[])))
  with check ((select public.has_role(array['owner', 'admin']::public.app_role[])));

create policy flash_sale_items_select on public.flash_sale_items
  for select to anon, authenticated
  using (
    (select public.is_staff())
    or (
      public.is_product_visible(product_id)
      and exists (select 1 from public.flash_sales f where f.id = flash_sale_id and f.is_active)
    )
  );
create policy flash_sale_items_write on public.flash_sale_items
  for all to authenticated
  using ((select public.has_role(array['owner', 'admin']::public.app_role[])))
  with check ((select public.has_role(array['owner', 'admin']::public.app_role[])));

create policy banners_select on public.banners
  for select to anon, authenticated
  using (
    (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()))
    or (select public.is_staff())
  );
create policy banners_write on public.banners
  for all to authenticated
  using ((select public.has_role(array['owner', 'admin']::public.app_role[])))
  with check ((select public.has_role(array['owner', 'admin']::public.app_role[])));
