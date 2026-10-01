-- ============================================================
-- NZO Industries — 05 catalog
-- Uang: bigint rupiah. Stok: cache dari inventory_movements (migration 06).
-- D-04/D-18: harga di produk; varian boleh override price (opsional).
-- ============================================================

create table public.categories (
  id               uuid primary key default gen_random_uuid(),
  parent_id        uuid references public.categories (id) on delete restrict,
  name             text not null,
  slug             text not null unique,
  description      text,
  image_public_id  text,
  is_automotive    boolean not null default true,
  sort_order       integer not null default 0,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint categories_not_self_parent check (parent_id is null or parent_id <> id),
  constraint categories_image_nzo check (image_public_id is null or image_public_id like 'nzo/%')
);

create index categories_parent_idx on public.categories (parent_id);

create table public.brands (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,
  description      text,
  logo_public_id   text,
  sort_order       integer not null default 0,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint brands_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint brands_logo_nzo check (logo_public_id is null or logo_public_id like 'nzo/%')
);

create table public.products (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text not null unique,
  sku                 text not null unique,
  price               bigint not null,
  compare_at_price    bigint,
  stock               integer not null default 0,
  status              public.product_status not null default 'draft',
  brand_id            uuid references public.brands (id) on delete set null,
  short_description   text,
  description         text,
  installation_guide  text,
  warranty_info       text,
  weight_grams        integer,
  length_mm           integer,
  width_mm            integer,
  height_mm           integer,
  meta_title          text,
  meta_description    text,
  jubelio_item_id     text unique,
  average_rating      numeric(3, 2) not null default 0,
  review_count        integer not null default 0,
  total_sold          integer not null default 0,
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  search_vector       tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(sku, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(short_description, '')), 'B')
    || setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) stored,
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint products_sku_format check (sku ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'),
  constraint products_price_non_negative check (price >= 0),
  constraint products_compare_at_gt_price check (compare_at_price is null or compare_at_price > price),
  constraint products_stock_non_negative check (stock >= 0),
  constraint products_dimensions_positive check (
    (weight_grams is null or weight_grams > 0)
    and (length_mm is null or length_mm > 0)
    and (width_mm is null or width_mm > 0)
    and (height_mm is null or height_mm > 0)
  )
);

create index products_status_idx on public.products (status);
create index products_brand_idx on public.products (brand_id);
create index products_published_at_idx on public.products (published_at desc) where status = 'published';
create index products_search_idx on public.products using gin (search_vector);
create index products_name_trgm_idx on public.products using gin (name extensions.gin_trgm_ops);
create index products_sku_trgm_idx on public.products using gin (sku extensions.gin_trgm_ops);

-- published_at otomatis saat pertama kali publish
create or replace function public.products_set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;

create trigger products_published_at
  before insert or update of status on public.products
  for each row execute function public.products_set_published_at();

create table public.product_variants (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references public.products (id) on delete cascade,
  sku               text not null unique,
  name              text not null,
  options           jsonb not null default '{}'::jsonb,
  price             bigint,
  compare_at_price  bigint,
  stock             integer not null default 0,
  weight_grams      integer,
  image_public_id   text,
  jubelio_item_id   text unique,
  sort_order        integer not null default 0,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint product_variants_sku_format check (sku ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'),
  constraint product_variants_price_non_negative check (price is null or price >= 0),
  constraint product_variants_compare_at check (
    compare_at_price is null or (price is not null and compare_at_price > price)
  ),
  constraint product_variants_stock_non_negative check (stock >= 0),
  constraint product_variants_weight_positive check (weight_grams is null or weight_grams > 0),
  constraint product_variants_options_object check (jsonb_typeof(options) = 'object'),
  constraint product_variants_image_nzo check (image_public_id is null or image_public_id like 'nzo/%')
);

create index product_variants_product_idx on public.product_variants (product_id);

create table public.product_categories (
  product_id   uuid not null references public.products (id) on delete cascade,
  category_id  uuid not null references public.categories (id) on delete cascade,
  primary key (product_id, category_id)
);

create index product_categories_category_idx on public.product_categories (category_id);

create table public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  variant_id  uuid references public.product_variants (id) on delete set null,
  public_id   text not null,
  alt_text    text,
  width       integer,
  height      integer,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  constraint product_images_public_id_nzo check (public_id like 'nzo/%' and public_id not like '%..%')
);

create index product_images_product_idx on public.product_images (product_id, sort_order);
create index product_images_variant_idx on public.product_images (variant_id);

create table public.product_fitments (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  model_id    uuid not null references public.vehicle_models (id) on delete cascade,
  year_start  smallint,
  year_end    smallint,
  notes       text,
  created_at  timestamptz not null default now(),
  constraint product_fitments_year_range check (
    (year_start is null or year_start between 1950 and 2100)
    and (year_end is null or year_end between coalesce(year_start, 1950) and 2100)
  ),
  constraint product_fitments_unique unique nulls not distinct (product_id, model_id, year_start, year_end)
);

create index product_fitments_model_year_idx on public.product_fitments (model_id, year_start, year_end);
create index product_fitments_product_idx on public.product_fitments (product_id);

create table public.product_specs (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  label       text not null,
  value       text not null,
  sort_order  integer not null default 0
);

create index product_specs_product_idx on public.product_specs (product_id, sort_order);

create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger brands_set_updated_at before update on public.brands
  for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger product_variants_set_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();

-- Produk terlihat publik bila published.
create or replace function public.is_product_visible(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.products p where p.id = p_product_id and p.status = 'published'
  );
$$;

-- ------------------------------------------------------------
-- RLS: baca publik untuk data aktif/published; tulis owner/admin.
-- Staf (aal2) bisa membaca semua untuk operasional.
-- stock hanya berubah lewat ledger (trigger), bukan update langsung.
-- ------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_images enable row level security;
alter table public.product_fitments enable row level security;
alter table public.product_specs enable row level security;

create policy categories_select on public.categories
  for select to anon, authenticated using (is_active or (select public.is_staff()));
create policy categories_write on public.categories
  for all to authenticated
  using ((select public.has_role(array['owner', 'admin']::public.app_role[])))
  with check ((select public.has_role(array['owner', 'admin']::public.app_role[])));

create policy brands_select on public.brands
  for select to anon, authenticated using (is_active or (select public.is_staff()));
create policy brands_write on public.brands
  for all to authenticated
  using ((select public.has_role(array['owner', 'admin']::public.app_role[])))
  with check ((select public.has_role(array['owner', 'admin']::public.app_role[])));

create policy products_select on public.products
  for select to anon, authenticated using (status = 'published' or (select public.is_staff()));
create policy products_write on public.products
  for all to authenticated
  using ((select public.has_role(array['owner', 'admin']::public.app_role[])))
  with check ((select public.has_role(array['owner', 'admin']::public.app_role[])));

create policy product_variants_select on public.product_variants
  for select to anon, authenticated
  using ((is_active and public.is_product_visible(product_id)) or (select public.is_staff()));
create policy product_variants_write on public.product_variants
  for all to authenticated
  using ((select public.has_role(array['owner', 'admin']::public.app_role[])))
  with check ((select public.has_role(array['owner', 'admin']::public.app_role[])));

create policy product_categories_select on public.product_categories
  for select to anon, authenticated
  using (public.is_product_visible(product_id) or (select public.is_staff()));
create policy product_categories_write on public.product_categories
  for all to authenticated
  using ((select public.has_role(array['owner', 'admin']::public.app_role[])))
  with check ((select public.has_role(array['owner', 'admin']::public.app_role[])));

create policy product_images_select on public.product_images
  for select to anon, authenticated
  using (public.is_product_visible(product_id) or (select public.is_staff()));
create policy product_images_write on public.product_images
  for all to authenticated
  using ((select public.has_role(array['owner', 'admin']::public.app_role[])))
  with check ((select public.has_role(array['owner', 'admin']::public.app_role[])));

create policy product_fitments_select on public.product_fitments
  for select to anon, authenticated
  using (public.is_product_visible(product_id) or (select public.is_staff()));
create policy product_fitments_write on public.product_fitments
  for all to authenticated
  using ((select public.has_role(array['owner', 'admin']::public.app_role[])))
  with check ((select public.has_role(array['owner', 'admin']::public.app_role[])));

create policy product_specs_select on public.product_specs
  for select to anon, authenticated
  using (public.is_product_visible(product_id) or (select public.is_staff()));
create policy product_specs_write on public.product_specs
  for all to authenticated
  using ((select public.has_role(array['owner', 'admin']::public.app_role[])))
  with check ((select public.has_role(array['owner', 'admin']::public.app_role[])));

-- ------------------------------------------------------------
-- Kolom cache (stock, rating, sold) hanya boleh ditulis oleh trigger internal
-- (ledger stok, rollup ulasan) yang menyalakan flag transaksi `nzo.cache_write`.
-- Insert dari client selalu mulai dari nol.
-- ------------------------------------------------------------
create or replace function public.guard_product_cache_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  internal boolean := coalesce(current_setting('nzo.cache_write', true), '') = 'on';
begin
  if internal then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.stock = 0;
    if tg_table_name = 'products' then
      new.average_rating = 0;
      new.review_count = 0;
      new.total_sold = 0;
    end if;
    return new;
  end if;

  if new.stock is distinct from old.stock then
    raise exception 'stock hanya berubah lewat inventory_movements' using errcode = '42501';
  end if;
  if tg_table_name = 'products' and (
    new.average_rating is distinct from old.average_rating
    or new.review_count is distinct from old.review_count
    or new.total_sold is distinct from old.total_sold
  ) then
    raise exception 'kolom cache produk tidak bisa diubah langsung' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger products_guard_cache
  before insert or update on public.products
  for each row execute function public.guard_product_cache_columns();

create trigger product_variants_guard_cache
  before insert or update on public.product_variants
  for each row execute function public.guard_product_cache_columns();
