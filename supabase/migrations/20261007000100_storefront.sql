-- ============================================================
-- NZO Industries — storefront (Fase 4)
-- D-27: fitment dua tingkat. is_verified = true (dikonfirmasi admin, badge
--       perisai "Cocok"); false = disebut di nama produk (saran import, label
--       "Disebut untuk …", tanpa perisai).
-- RPC katalog: pencarian + filter + facet untuk PLP, security invoker (RLS
-- berlaku) dan selalu dibatasi produk published.
-- ============================================================

alter table public.product_fitments
  add column is_verified boolean not null default true,
  add column source text not null default 'admin',
  add constraint product_fitments_source check (source in ('admin', 'import'));

create index product_fitments_verified_model_idx
  on public.product_fitments (model_id, year_start, year_end) where is_verified;
create index products_published_price_idx on public.products (price) where status = 'published';
create index products_published_sold_idx on public.products (total_sold desc) where status = 'published';

-- ------------------------------------------------------------
-- Filter katalog bersama (dipakai catalog_search dan catalog_facets).
-- ------------------------------------------------------------
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
language sql
stable
security invoker
set search_path = ''
as $$
  with recursive cat as (
    select c.id from public.categories c where c.slug = p_category_slug
    union all
    select c.id from public.categories c join cat on c.parent_id = cat.id
  ),
  q as (
    select
      nullif(trim(p_query), '') as raw,
      case when nullif(trim(p_query), '') is null then null
           else websearch_to_tsquery('simple', p_query) end as tsq
  )
  select
    p.id,
    case when q.tsq is null then 0::real else ts_rank(p.search_vector, q.tsq) end,
    case
      when p_model_id is null then null
      when exists (
        select 1 from public.product_fitments f
        where f.product_id = p.id and f.model_id = p_model_id and f.is_verified
          and (p_year is null or ((f.year_start is null or f.year_start <= p_year)
                                  and (f.year_end is null or f.year_end >= p_year)))
      ) then 'verified'
      when exists (
        select 1 from public.product_fitments f
        where f.product_id = p.id and f.model_id = p_model_id
          and (p_year is null or ((f.year_start is null or f.year_start <= p_year)
                                  and (f.year_end is null or f.year_end >= p_year)))
      ) then 'mentioned'
    end
  from public.products p
  cross join q
  where p.status = 'published'
    and (q.raw is null
         or p.search_vector @@ q.tsq
         or p.name ilike '%' || q.raw || '%'
         or p.sku ilike q.raw || '%')
    and (p_category_slug is null or exists (
          select 1 from public.product_categories pc
          where pc.product_id = p.id and pc.category_id in (select id from cat)))
    and (p_brand_slugs is null or cardinality(p_brand_slugs) = 0 or exists (
          select 1 from public.brands b where b.id = p.brand_id and b.slug = any (p_brand_slugs)))
    and (not coalesce(p_vehicle_only, false) or p_model_id is null or exists (
          select 1 from public.product_fitments f
          where f.product_id = p.id and f.model_id = p_model_id
            and (p_year is null or ((f.year_start is null or f.year_start <= p_year)
                                    and (f.year_end is null or f.year_end >= p_year)))))
    and (p_min_price is null or p.price >= p_min_price)
    and (p_max_price is null or p.price <= p_max_price)
    and (not coalesce(p_in_stock, false) or p.stock > 0)
    and (p_min_rating is null or p.average_rating >= p_min_rating)
    and (not coalesce(p_on_sale, false) or p.compare_at_price is not null)
$$;

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
  select
    p.id, p.slug, p.name, p.sku, p.price, p.compare_at_price, p.stock,
    p.average_rating, p.review_count, p.total_sold,
    b.name, b.slug,
    (select i.public_id from public.product_images i
      where i.product_id = p.id order by i.sort_order, i.created_at limit 1),
    exists (select 1 from public.product_variants v where v.product_id = p.id and v.is_active),
    f.fit_level,
    count(*) over ()
  from private.catalog_filter(
    p_query, p_category_slug, p_brand_slugs, p_model_id, p_year, p_vehicle_only,
    p_min_price, p_max_price, p_in_stock, p_min_rating, p_on_sale
  ) f
  join public.products p on p.id = f.product_id
  left join public.brands b on b.id = p.brand_id
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
  limit least(greatest(p_limit, 1), 60)
  offset greatest(p_offset, 0)
$$;

create or replace function public.catalog_facets(
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
  p_on_sale boolean default false
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  -- Facet brand mengabaikan filter brand; facet kategori mengabaikan filter
  -- kategori, supaya pilihan lain tetap terlihat.
  select jsonb_build_object(
    'brands', coalesce((
      select jsonb_agg(jsonb_build_object('slug', x.slug, 'name', x.name, 'count', x.n) order by x.n desc, x.name)
      from (
        select b.slug, b.name, count(*) as n
        from private.catalog_filter(p_query, p_category_slug, null, p_model_id, p_year, p_vehicle_only,
                                    p_min_price, p_max_price, p_in_stock, p_min_rating, p_on_sale) f
        join public.products p on p.id = f.product_id
        join public.brands b on b.id = p.brand_id
        group by b.slug, b.name
        order by n desc
        limit 60
      ) x
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('slug', x.slug, 'count', x.n))
      from (
        select c.slug, count(distinct pc.product_id) as n
        from private.catalog_filter(p_query, null, p_brand_slugs, p_model_id, p_year, p_vehicle_only,
                                    p_min_price, p_max_price, p_in_stock, p_min_rating, p_on_sale) f
        join public.product_categories pc on pc.product_id = f.product_id
        join public.categories c on c.id = pc.category_id
        group by c.slug
      ) x
    ), '[]'::jsonb),
    'price', (
      select jsonb_build_object('min', min(p.price), 'max', max(p.price))
      from private.catalog_filter(p_query, p_category_slug, p_brand_slugs, p_model_id, p_year, p_vehicle_only,
                                  null, null, p_in_stock, p_min_rating, p_on_sale) f
      join public.products p on p.id = f.product_id
    )
  )
$$;

revoke all on function private.catalog_filter(text, text, text[], uuid, smallint, boolean, bigint, bigint, boolean, numeric, boolean) from public;
grant execute on function private.catalog_filter(text, text, text[], uuid, smallint, boolean, bigint, bigint, boolean, numeric, boolean) to anon, authenticated, service_role;
grant execute on function public.catalog_search(text, text, text[], uuid, smallint, boolean, bigint, bigint, boolean, numeric, boolean, text, integer, integer) to anon, authenticated;
grant execute on function public.catalog_facets(text, text, text[], uuid, smallint, boolean, bigint, bigint, boolean, numeric, boolean) to anon, authenticated;

-- ------------------------------------------------------------
-- import_commit_batch: + saran fitment (is_verified = false).
-- ------------------------------------------------------------
create or replace function public.import_commit_batch(p_batch_id uuid, p_limit integer default 1000)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_service boolean := coalesce((select auth.jwt()) ->> 'role', '') = 'service_role';
  r record;
  m jsonb;
  v jsonb;
  pid uuid;
  vid uuid;
  bid uuid;
  cur_stock integer;
  target_stock integer;
  n_committed integer := 0;
  n_failed integer := 0;
  n_remaining integer;
begin
  if not is_service and not private.has_role(array['owner', 'admin']::public.app_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not exists (select 1 from public.import_batches b where b.id = p_batch_id) then
    raise exception 'batch tidak ditemukan' using errcode = 'P0002';
  end if;

  -- riwayat import cukup di import_batches/import_logs, bukan audit per baris
  perform set_config('nzo.skip_audit', 'on', true);

  update public.import_batches
    set status = 'running', started_at = coalesce(started_at, now())
    where id = p_batch_id and status in ('pending', 'running');

  for r in
    select ip.id, ip.mapped
    from public.import_products ip
    where ip.batch_id = p_batch_id and ip.status = 'valid'
    order by ip.row_index nulls last, ip.created_at
    limit greatest(1, least(p_limit, 5000))
    for update skip locked
  loop
    m := r.mapped;
    begin
      bid := null;
      if nullif(m ->> 'brand_slug', '') is not null then
        insert into public.brands (name, slug)
          values (m ->> 'brand_name', m ->> 'brand_slug')
          on conflict (slug) do nothing;
        select b.id into bid from public.brands b where b.slug = m ->> 'brand_slug';
      end if;

      insert into public.products as p (
        name, slug, sku, source_sku, search_keywords, price, compare_at_price,
        weight_grams, brand_id, status
      ) values (
        m ->> 'name', m ->> 'slug', m ->> 'sku', nullif(m ->> 'source_sku', ''),
        nullif(m ->> 'search_keywords', ''), (m ->> 'price')::bigint,
        nullif(m ->> 'compare_at_price', '')::bigint, nullif(m ->> 'weight_grams', '')::integer,
        bid, 'draft'
      )
      on conflict (sku) do update set
        name = case when p.import_locked then p.name else excluded.name end,
        price = case when p.import_locked then p.price else excluded.price end,
        compare_at_price = case when p.import_locked then p.compare_at_price else excluded.compare_at_price end,
        source_sku = coalesce(excluded.source_sku, p.source_sku),
        search_keywords = coalesce(excluded.search_keywords, p.search_keywords),
        weight_grams = coalesce(excluded.weight_grams, p.weight_grams),
        brand_id = coalesce(p.brand_id, excluded.brand_id)
      returning p.id into pid;

      for v in select * from jsonb_array_elements(coalesce(m -> 'variants', '[]'::jsonb))
      loop
        vid := null;
        insert into public.product_variants as pv (
          product_id, sku, source_sku, name, options, price, compare_at_price, weight_grams, sort_order
        ) values (
          pid, v ->> 'sku', nullif(v ->> 'source_sku', ''), v ->> 'name',
          coalesce(v -> 'options', '{}'::jsonb), nullif(v ->> 'price', '')::bigint,
          nullif(v ->> 'compare_at_price', '')::bigint, nullif(v ->> 'weight_grams', '')::integer,
          coalesce((v ->> 'sort_order')::integer, 0)
        )
        on conflict (sku) do update set
          name = excluded.name,
          options = excluded.options,
          source_sku = coalesce(excluded.source_sku, pv.source_sku),
          price = (select case when p2.import_locked then pv.price else excluded.price end
                   from public.products p2 where p2.id = pv.product_id),
          compare_at_price = (select case when p2.import_locked then pv.compare_at_price else excluded.compare_at_price end
                              from public.products p2 where p2.id = pv.product_id),
          weight_grams = coalesce(excluded.weight_grams, pv.weight_grams),
          sort_order = excluded.sort_order
        where pv.product_id = pid
        returning pv.id into vid;

        if vid is null then
          raise exception 'SKU varian % sudah dipakai produk lain', v ->> 'sku';
        end if;

        if nullif(v ->> 'stock', '') is not null then
          target_stock := (v ->> 'stock')::integer;
          select pv.stock into cur_stock from public.product_variants pv where pv.id = vid;
          if target_stock <> cur_stock then
            insert into public.inventory_movements (product_id, variant_id, quantity, type, reason, reference_type, reference_id)
              values (pid, vid, target_stock - cur_stock, 'adjustment', 'Import stok', 'import_batch', p_batch_id);
          end if;
        end if;
      end loop;

      if jsonb_array_length(coalesce(m -> 'variants', '[]'::jsonb)) = 0
         and nullif(m ->> 'stock', '') is not null then
        target_stock := (m ->> 'stock')::integer;
        select p3.stock into cur_stock from public.products p3 where p3.id = pid;
        if target_stock <> cur_stock then
          insert into public.inventory_movements (product_id, quantity, type, reason, reference_type, reference_id)
            values (pid, target_stock - cur_stock, 'adjustment', 'Import stok', 'import_batch', p_batch_id);
        end if;
      end if;

      insert into public.product_categories (product_id, category_id)
        select pid, c.id
        from public.categories c
        where c.slug in (select jsonb_array_elements_text(coalesce(m -> 'category_slugs', '[]'::jsonb)))
        on conflict do nothing;

      insert into public.product_specs (product_id, label, value, sort_order)
        select pid, s ->> 'label', s ->> 'value', coalesce((s ->> 'sort_order')::integer, 0)
        from jsonb_array_elements(coalesce(m -> 'specs', '[]'::jsonb)) s
        where not exists (
          select 1 from public.product_specs ps where ps.product_id = pid and ps.label = s ->> 'label'
        );

      -- D-27: saran fitment dari nama produk = tingkat "mentioned" (belum diverifikasi).
      -- Tidak ditambahkan bila model itu sudah punya fitment apa pun untuk produk ini.
      insert into public.product_fitments (product_id, model_id, is_verified, source)
        select distinct pid, vm.id, false, 'import'
        from jsonb_array_elements(coalesce(m -> 'fitment_suggestions', '[]'::jsonb)) f
        join public.vehicle_makes mk
          on mk.slug = f ->> 'make_slug' and mk.vehicle_type::text = f ->> 'vehicle_type'
        join public.vehicle_models vm on vm.make_id = mk.id and vm.slug = f ->> 'model_slug'
        where not exists (
          select 1 from public.product_fitments pf where pf.product_id = pid and pf.model_id = vm.id
        )
        on conflict do nothing;

      update public.import_products
        set status = 'committed', product_id = pid, error = null
        where id = r.id;
      n_committed := n_committed + 1;
    exception when others then
      update public.import_products
        set status = 'invalid', error = left(sqlerrm, 500)
        where id = r.id;
      insert into public.import_logs (batch_id, level, sku, message)
        values (p_batch_id, 'error', m ->> 'sku', left(sqlerrm, 500));
      n_failed := n_failed + 1;
    end;
  end loop;

  select count(*) into n_remaining
    from public.import_products ip
    where ip.batch_id = p_batch_id and ip.status = 'valid';

  update public.import_batches b set
    success_rows = (select count(*) from public.import_products ip where ip.batch_id = b.id and ip.status = 'committed'),
    failed_rows = (select count(*) from public.import_products ip where ip.batch_id = b.id and ip.status = 'invalid'),
    skipped_rows = (select count(*) from public.import_products ip where ip.batch_id = b.id and ip.status = 'skipped'),
    status = case when n_remaining = 0 then 'completed'::public.import_status else 'running'::public.import_status end,
    finished_at = case when n_remaining = 0 then now() else null end
  where b.id = p_batch_id;

  return jsonb_build_object('committed', n_committed, 'failed', n_failed, 'remaining', n_remaining);
end;
$$;

revoke all on function public.import_commit_batch(uuid, integer) from public, anon;
grant execute on function public.import_commit_batch(uuid, integer) to authenticated, service_role;
