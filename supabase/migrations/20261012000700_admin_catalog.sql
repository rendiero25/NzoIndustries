-- Fase 8B: struktur katalog di admin (kategori, brand, kendaraan).
-- Tulis biasa tetap lewat RLS (*_write owner/admin + trigger audit). RPC di sini
-- hanya untuk operasi yang butuh cek gabungan atau banyak baris sekaligus.

-- Urutan saudara (drag). Semua id wajib satu induk yang sama.
create or replace function public.admin_reorder_categories(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parents int;
begin
  if not private.has_role(array['owner', 'admin']::public.app_role[]) then
    raise exception 'Tidak diizinkan' using errcode = '42501';
  end if;
  if coalesce(array_length(p_ids, 1), 0) = 0 or array_length(p_ids, 1) > 500 then
    raise exception 'Daftar kategori tidak valid';
  end if;

  select count(distinct coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid))
    into v_parents
    from public.categories
   where id = any (p_ids);
  if v_parents <> 1
     or (select count(*) from public.categories where id = any (p_ids)) <> array_length(p_ids, 1) then
    raise exception 'Kategori harus satu induk yang sama';
  end if;

  update public.categories c
     set sort_order = o.ord
    from unnest(p_ids) with ordinality as o(id, ord)
   where c.id = o.id
     and c.sort_order is distinct from o.ord::int;
end;
$$;

-- Hapus kategori: tolak bila punya subkategori atau produk (product_categories
-- on delete cascade akan diam-diam melepas produk).
create or replace function public.admin_delete_category(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_children int;
  v_products int;
begin
  if not private.has_role(array['owner', 'admin']::public.app_role[]) then
    raise exception 'Tidak diizinkan' using errcode = '42501';
  end if;
  select count(*) into v_children from public.categories where parent_id = p_id;
  if v_children > 0 then
    raise exception 'Kategori masih punya % subkategori. Pindahkan atau hapus dulu.', v_children;
  end if;
  select count(*) into v_products from public.product_categories where category_id = p_id;
  if v_products > 0 then
    raise exception 'Kategori masih dipakai % produk. Nonaktifkan saja, atau pindahkan produknya.', v_products;
  end if;
  delete from public.categories where id = p_id;
  if not found then
    raise exception 'Kategori tidak ditemukan';
  end if;
end;
$$;

-- Hapus brand: tolak bila masih dipakai produk (FK on delete set null).
create or replace function public.admin_delete_brand(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_products int;
begin
  if not private.has_role(array['owner', 'admin']::public.app_role[]) then
    raise exception 'Tidak diizinkan' using errcode = '42501';
  end if;
  select count(*) into v_products from public.products where brand_id = p_id;
  if v_products > 0 then
    raise exception 'Brand masih dipakai % produk. Nonaktifkan saja.', v_products;
  end if;
  delete from public.brands where id = p_id;
  if not found then
    raise exception 'Brand tidak ditemukan';
  end if;
end;
$$;

-- Hapus model kendaraan: tolak bila ada fitment (cascade) atau garasi pelanggan.
create or replace function public.admin_delete_vehicle_model(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fit int;
  v_garage int;
begin
  if not private.has_role(array['owner', 'admin']::public.app_role[]) then
    raise exception 'Tidak diizinkan' using errcode = '42501';
  end if;
  select count(*) into v_fit from public.product_fitments where model_id = p_id;
  select count(*) into v_garage from public.user_vehicles where model_id = p_id;
  if v_fit > 0 or v_garage > 0 then
    raise exception 'Model dipakai % kecocokan produk dan % garasi pelanggan. Nonaktifkan saja.', v_fit, v_garage;
  end if;
  delete from public.vehicle_models where id = p_id;
  if not found then
    raise exception 'Model tidak ditemukan';
  end if;
end;
$$;

-- Jumlah produk per kategori (langsung) dan per brand untuk tabel admin.
create or replace function public.admin_catalog_counts()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not private.has_role(array['owner', 'admin']::public.app_role[]) then null
    else jsonb_build_object(
      'categories', coalesce((
        select jsonb_object_agg(category_id, n)
          from (select category_id, count(*) n from public.product_categories group by category_id) s
      ), '{}'::jsonb),
      'brands', coalesce((
        select jsonb_object_agg(brand_id, n)
          from (select brand_id, count(*) n from public.products where brand_id is not null group by brand_id) s
      ), '{}'::jsonb),
      'models', coalesce((
        select jsonb_object_agg(model_id, n)
          from (select model_id, count(*) n from public.product_fitments group by model_id) s
      ), '{}'::jsonb)
    )
  end;
$$;

revoke all on function public.admin_reorder_categories(uuid[]) from public, anon;
revoke all on function public.admin_delete_category(uuid) from public, anon;
revoke all on function public.admin_delete_brand(uuid) from public, anon;
revoke all on function public.admin_delete_vehicle_model(uuid) from public, anon;
revoke all on function public.admin_catalog_counts() from public, anon;
grant execute on function public.admin_reorder_categories(uuid[]) to authenticated;
grant execute on function public.admin_delete_category(uuid) to authenticated;
grant execute on function public.admin_delete_brand(uuid) to authenticated;
grant execute on function public.admin_delete_vehicle_model(uuid) to authenticated;
grant execute on function public.admin_catalog_counts() to authenticated;

-- Detail error per batch import untuk riwayat di /admin/import sudah dibaca
-- langsung dari import_logs (RLS import_logs_admins).
