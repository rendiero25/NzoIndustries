-- ============================================================
-- NZO Industries — bacaan publik storefront (Fase 4)
-- Agregat yang tidak bisa lewat PostgREST biasa (aggregate dimatikan) dan
-- nama pengulas yang disamarkan (profiles tidak publik, UU PDP).
-- ============================================================

-- Brand yang punya produk published + jumlahnya (halaman /brands, marquee).
create or replace function public.catalog_brands()
returns table (slug text, name text, logo_public_id text, product_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select b.slug, b.name, b.logo_public_id, count(p.id)
  from public.brands b
  join public.products p on p.brand_id = b.id and p.status = 'published'
  where b.is_active
  group by b.id
  order by b.name
$$;

-- Angka nyata untuk strip statistik beranda (tanpa angka karangan).
create or replace function public.catalog_stats()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'products', (select count(*) from public.products where status = 'published'),
    'brands', (select count(distinct brand_id) from public.products where status = 'published' and brand_id is not null),
    'vehicle_models', (select count(*) from public.vehicle_models where is_active)
  )
$$;

-- Ulasan published dengan nama pengulas disamarkan ("Budi S.").
create or replace function public.public_reviews(p_product_id uuid default null, p_limit integer default 6)
returns table (
  id uuid,
  product_id uuid,
  product_name text,
  product_slug text,
  rating smallint,
  comment text,
  reply text,
  reviewer text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id, r.product_id, p.name, p.slug, r.rating, r.comment, r.reply,
    coalesce(
      nullif(
        trim(split_part(coalesce(pr.full_name, ''), ' ', 1) || ' ' ||
             coalesce(left(nullif(split_part(coalesce(pr.full_name, ''), ' ', 2), ''), 1) || '.', '')),
        ''),
      'Pelanggan NZO'
    ),
    r.created_at
  from public.reviews r
  join public.products p on p.id = r.product_id and p.status = 'published'
  left join public.profiles pr on pr.id = r.user_id
  where r.status = 'published'
    and (p_product_id is null or r.product_id = p_product_id)
  order by r.created_at desc
  limit least(greatest(p_limit, 1), 30)
$$;

revoke all on function public.public_reviews(uuid, integer) from public;
grant execute on function public.catalog_brands() to anon, authenticated;
grant execute on function public.catalog_stats() to anon, authenticated;
grant execute on function public.public_reviews(uuid, integer) to anon, authenticated;
