-- ============================================================
-- catalog_search dua tahap: urutkan + potong halaman dulu, baru ambil detail
-- (gambar utama, ada varian, brand) untuk baris yang tampil saja.
-- Versi pertama menghitung subquery itu untuk semua produk (±400 ms).
-- ============================================================

create or replace function public.catalog_search(
  p_query text default null,
  p_category_slug text default null,
  p_brand_slugs text[] default null,
  p_model_id uuid default null,
  p_year smallint default null,
  p_vehicle_only boolean default false,
  p_min_price bigint default null,
  p_max_price bigint default null,
  p_in_stock boolean default false,
  p_min_rating numeric default null,
  p_on_sale boolean default false,
  p_sort text default 'relevance',
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid,
  slug text,
  name text,
  sku text,
  price bigint,
  compare_at_price bigint,
  stock integer,
  average_rating numeric,
  review_count integer,
  total_sold integer,
  brand_name text,
  brand_slug text,
  primary_image text,
  has_variants boolean,
  fit_level text,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with page as (
    select
      p.id, f.fit_level,
      count(*) over () as total_count,
      row_number() over (
        order by
          case when f.fit_level = 'verified' then 0 when f.fit_level = 'mentioned' then 1 else 2 end,
          case when p_sort = 'price_asc' then p.price end asc nulls last,
          case when p_sort = 'price_desc' then p.price end desc nulls last,
          case when p_sort = 'rating' then p.average_rating end desc nulls last,
          case when p_sort = 'bestseller' then p.total_sold end desc nulls last,
          case when p_sort = 'newest' then p.published_at end desc nulls last,
          case when p_sort = 'relevance' then f.rank end desc nulls last,
          (p.stock > 0) desc,
          p.total_sold desc,
          p.published_at desc nulls last,
          p.id
      ) as ord
    from private.catalog_filter(
      p_query, p_category_slug, p_brand_slugs, p_model_id, p_year, p_vehicle_only,
      p_min_price, p_max_price, p_in_stock, p_min_rating, p_on_sale
    ) f
    join public.products p on p.id = f.product_id
    order by ord
    limit least(greatest(p_limit, 1), 60)
    offset greatest(p_offset, 0)
  )
  select
    p.id, p.slug, p.name, p.sku, p.price, p.compare_at_price, p.stock,
    p.average_rating, p.review_count, p.total_sold,
    b.name, b.slug,
    (select i.public_id from public.product_images i
      where i.product_id = p.id order by i.sort_order, i.created_at limit 1),
    exists (select 1 from public.product_variants v where v.product_id = p.id and v.is_active),
    pg.fit_level,
    pg.total_count
  from page pg
  join public.products p on p.id = pg.id
  left join public.brands b on b.id = p.brand_id
  order by pg.ord
$$;

grant execute on function public.catalog_search(text, text, text[], uuid, smallint, boolean, bigint, bigint, boolean, numeric, boolean, text, integer, integer) to anon, authenticated;
