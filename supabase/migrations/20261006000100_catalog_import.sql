-- ============================================================
-- NZO Industries — catalog import (Fase 3)
-- D-23: SKU web dinormalisasi; SKU asli disimpan di source_sku untuk sinkron
--       Jubelio/marketplace.
-- D-24: judul marketplace asli disimpan di search_keywords (ikut dicari, tidak
--       tampil). import_locked menyala saat admin mengedit produk (Fase 8),
--       sehingga import ulang tidak menimpa nama/harga hasil kurasi.
-- Staging: satu baris import_products = satu produk (varian di mapped.variants).
-- ============================================================

alter type public.import_source add value if not exists 'jubelio_export';

alter table public.products
  add column source_sku text unique,
  add column search_keywords text,
  add column import_locked boolean not null default false;

alter table public.product_variants
  add column source_sku text unique;

-- search_vector ikut memuat search_keywords (bobot C)
drop index if exists public.products_search_idx;
alter table public.products drop column search_vector;
alter table public.products
  add column search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(sku, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(short_description, '')), 'B')
    || setweight(to_tsvector('simple', coalesce(search_keywords, '')), 'C')
    || setweight(to_tsvector('simple', coalesce(description, '')), 'D')
  ) stored;
create index products_search_idx on public.products using gin (search_vector);

alter table public.import_products
  add column row_index integer,
  add column warnings text[] not null default '{}';

create index import_products_batch_row_idx on public.import_products (batch_id, row_index);

-- ------------------------------------------------------------
-- Commit staging → products (draft). Dipanggil berulang per chunk sampai
-- remaining = 0. Idempotent: upsert by SKU web (deterministik dari sumber).
-- Hanya owner/admin (RLS-level role check) atau service role (script).
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
