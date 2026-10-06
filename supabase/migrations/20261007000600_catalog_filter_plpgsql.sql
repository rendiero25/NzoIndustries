-- ============================================================
-- catalog_filter sebagai plpgsql (RETURN QUERY). Fungsi SQL non-inline tetap
-- ±500 ms untuk filter kendaraan walau query yang sama 15 ms bila dieksekusi
-- langsung/prepared; plpgsql memakai plan cache normal.
-- ============================================================

create or replace function private.catalog_filter(
  p_query text,
  p_category_slug text,
  p_brand_slugs text[],
  p_model_id uuid,
  p_year smallint,
  p_vehicle_only boolean,
  p_min_price bigint,
  p_max_price bigint,
  p_in_stock boolean,
  p_min_rating numeric,
  p_on_sale boolean
)
returns table (product_id uuid, rank real, fit_level text)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  return query
  with recursive cat as (
    select c.id from public.categories c where c.slug = p_category_slug and c.is_active
    union all
    select c.id from public.categories c join cat on c.parent_id = cat.id where c.is_active
  ),
  q as (
    select
      nullif(trim(p_query), '') as raw,
      case when nullif(trim(p_query), '') is null then null
           else websearch_to_tsquery('simple', p_query) end as tsq
  ),
  fit as materialized (
    select f.product_id, bool_or(f.is_verified) as verified
    from public.product_fitments f
    where p_model_id is not null
      and f.model_id = p_model_id
      and (p_year is null or ((f.year_start is null or f.year_start <= p_year)
                              and (f.year_end is null or f.year_end >= p_year)))
    group by f.product_id
  ),
  in_cat as materialized (
    select distinct pc.product_id
    from public.product_categories pc
    where p_category_slug is not null and pc.category_id in (select id from cat)
  ),
  brand_ids as materialized (
    select b.id from public.brands b
    where p_brand_slugs is not null and b.slug = any (p_brand_slugs)
  )
  select
    p.id,
    case when q.tsq is null then 0::real else ts_rank(p.search_vector, q.tsq) end,
    case when fit.product_id is null then null when fit.verified then 'verified' else 'mentioned' end
  from public.products p
  cross join q
  left join fit on fit.product_id = p.id
  where p.status = 'published'
    and (q.raw is null
         or p.search_vector @@ q.tsq
         or p.name ilike '%' || q.raw || '%'
         or p.sku ilike q.raw || '%')
    and (p_category_slug is null or p.id in (select product_id from in_cat))
    and (p_brand_slugs is null or cardinality(p_brand_slugs) = 0 or p.brand_id in (select id from brand_ids))
    and (not coalesce(p_vehicle_only, false) or p_model_id is null or fit.product_id is not null)
    and (p_min_price is null or p.price >= p_min_price)
    and (p_max_price is null or p.price <= p_max_price)
    and (not coalesce(p_in_stock, false) or p.stock > 0)
    and (p_min_rating is null or p.average_rating >= p_min_rating)
    and (not coalesce(p_on_sale, false) or p.compare_at_price is not null);
end;
$$;

revoke all on function private.catalog_filter(text, text, text[], uuid, smallint, boolean, bigint, bigint, boolean, numeric, boolean) from public;
grant execute on function private.catalog_filter(text, text, text[], uuid, smallint, boolean, bigint, bigint, boolean, numeric, boolean) to anon, authenticated, service_role;
