-- ============================================================
-- NZO Industries — Fase 8A: produk admin (D-38 diskon = harga coret massal)
-- ============================================================

-- Diskon massal: harga normal disimpan di compare_at_price, harga jual turun.
--   percent : value = persen (1–90)
--   amount  : value = potongan rupiah
--   clear   : kembalikan harga normal (price = compare_at_price)
-- Sasaran: daftar produk dan/atau satu kategori (termasuk turunannya).
create or replace function public.admin_bulk_discount(
  p_product_ids uuid[],
  p_category_id uuid,
  p_mode text,
  p_value bigint default 0
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  targets uuid[];
  n integer;
begin
  if not private.has_role(array['owner', 'admin']::public.app_role[]) then
    raise exception 'Akses ditolak.' using errcode = '42501';
  end if;
  if p_mode not in ('percent', 'amount', 'clear') then
    raise exception 'Mode diskon tidak valid.' using errcode = 'P0001';
  end if;
  if p_mode = 'percent' and (p_value < 1 or p_value > 90) then
    raise exception 'Persen diskon 1–90.' using errcode = 'P0001';
  end if;
  if p_mode = 'amount' and p_value < 1 then
    raise exception 'Potongan minimal Rp1.' using errcode = 'P0001';
  end if;

  with recursive cats as (
    select id from public.categories where id = p_category_id
    union all
    select c.id from public.categories c join cats on c.parent_id = cats.id
  )
  select array_agg(distinct x) into targets from (
    select unnest(coalesce(p_product_ids, '{}'::uuid[])) as x
    union
    select pc.product_id from public.product_categories pc where pc.category_id in (select id from cats)
  ) t;

  if targets is null or cardinality(targets) = 0 then
    return 0;
  end if;
  if cardinality(targets) > 5000 then
    raise exception 'Maksimal 5.000 produk per aksi.' using errcode = 'P0001';
  end if;

  if p_mode = 'clear' then
    update public.products
      set price = compare_at_price, compare_at_price = null, import_locked = true
      where id = any(targets) and compare_at_price is not null;
    update public.product_variants
      set price = compare_at_price, compare_at_price = null
      where product_id = any(targets) and compare_at_price is not null and price is not null;
  else
    -- Basis = harga normal (compare_at bila sudah diskon, supaya tidak bertumpuk).
    update public.products p
      set compare_at_price = base,
          price = greatest(0, case when p_mode = 'percent' then round(base * (100 - p_value) / 100.0)::bigint else base - p_value end),
          import_locked = true
      from (select id, coalesce(compare_at_price, price) as base from public.products where id = any(targets)) b
      where p.id = b.id and (case when p_mode = 'percent' then round(b.base * (100 - p_value) / 100.0)::bigint else b.base - p_value end) < b.base
        and (case when p_mode = 'percent' then round(b.base * (100 - p_value) / 100.0)::bigint else b.base - p_value end) >= 0;
    update public.product_variants v
      set compare_at_price = base,
          price = case when p_mode = 'percent' then round(base * (100 - p_value) / 100.0)::bigint else base - p_value end
      from (select id, coalesce(compare_at_price, price) as base from public.product_variants
            where product_id = any(targets) and price is not null) b
      where v.id = b.id and (case when p_mode = 'percent' then round(b.base * (100 - p_value) / 100.0)::bigint else b.base - p_value end) between 0 and b.base - 1;
  end if;
  get diagnostics n = row_count;
  return cardinality(targets);
end;
$$;

-- Duplikat produk sebagai draft (tanpa stok; foto dipakai bersama public_id yang sama).
create or replace function public.admin_duplicate_product(p_product_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  src public.products;
  new_id uuid;
  suffix text := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
begin
  if not private.has_role(array['owner', 'admin']::public.app_role[]) then
    raise exception 'Akses ditolak.' using errcode = '42501';
  end if;
  select * into src from public.products where id = p_product_id;
  if not found then
    raise exception 'Produk tidak ditemukan.' using errcode = 'P0001';
  end if;

  insert into public.products (
    name, slug, sku, price, compare_at_price, status, brand_id, short_description, description,
    installation_guide, warranty_info, weight_grams, length_mm, width_mm, height_mm,
    meta_title, meta_description, import_locked
  ) values (
    src.name || ' (salinan)', left(src.slug, 70) || '-salinan-' || suffix, left(src.sku, 55) || '-C' || upper(suffix),
    src.price, src.compare_at_price, 'draft', src.brand_id, src.short_description, src.description,
    src.installation_guide, src.warranty_info, src.weight_grams, src.length_mm, src.width_mm, src.height_mm,
    src.meta_title, src.meta_description, true
  ) returning id into new_id;

  insert into public.product_categories (product_id, category_id)
    select new_id, category_id from public.product_categories where product_id = src.id;
  insert into public.product_specs (product_id, label, value, sort_order)
    select new_id, label, value, sort_order from public.product_specs where product_id = src.id;
  insert into public.product_fitments (product_id, model_id, year_start, year_end, notes, is_verified, source)
    select new_id, model_id, year_start, year_end, notes, is_verified, source from public.product_fitments where product_id = src.id;
  insert into public.product_variants (product_id, sku, name, options, price, compare_at_price, weight_grams, image_public_id, sort_order, is_active)
    select new_id, left(sku, 55) || '-C' || upper(suffix), name, options, price, compare_at_price, weight_grams, image_public_id, sort_order, is_active
    from public.product_variants where product_id = src.id;
  insert into public.product_images (product_id, public_id, alt_text, width, height, sort_order)
    select new_id, public_id, alt_text, width, height, sort_order from public.product_images where product_id = src.id and variant_id is null;
  return new_id;
end;
$$;

revoke all on function public.admin_bulk_discount(uuid[], uuid, text, bigint) from public, anon;
revoke all on function public.admin_duplicate_product(uuid) from public, anon;
grant execute on function public.admin_bulk_discount(uuid[], uuid, text, bigint) to authenticated;
grant execute on function public.admin_duplicate_product(uuid) to authenticated;
