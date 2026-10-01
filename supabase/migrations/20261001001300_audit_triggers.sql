-- ============================================================
-- NZO Industries — 13 audit trail (security rule 8)
-- Mencatat perubahan oleh staf (dan sistem/service role) pada tabel yang
-- dikelola admin. Aksi pelanggan biasa tidak dicatat di sini.
-- Kolom sensitif (alamat lengkap, catatan pelanggan) dan kolom turunan
-- (search_vector, updated_at, cache stok/rating) dibuang dari snapshot.
-- ============================================================

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_role public.app_role := public.current_app_role();
  old_data jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_data jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  ignored text[] := array[
    'search_vector', 'updated_at', 'stock', 'average_rating', 'review_count', 'total_sold',
    'shipping_address', 'customer_note'
  ];
  k text;
begin
  -- Seed data awal menyalakan flag ini (hanya bisa lewat SQL langsung, bukan PostgREST).
  if coalesce(current_setting('nzo.skip_audit', true), '') = 'on' then
    return null;
  end if;

  -- Hanya staf atau sistem (tanpa auth.uid, mis. service role / trigger internal).
  if actor is not null and (actor_role is null or actor_role = 'customer') then
    return null;
  end if;

  -- Profil baru dari signup tidak perlu dicatat.
  if tg_table_name = 'profiles' and tg_op = 'INSERT' then
    return null;
  end if;

  -- Profil: hanya role & status blokir yang relevan untuk audit.
  if tg_table_name = 'profiles' then
    old_data := case when old_data is null then null
      else jsonb_build_object('id', old_data -> 'id', 'role', old_data -> 'role', 'is_blocked', old_data -> 'is_blocked') end;
    new_data := case when new_data is null then null
      else jsonb_build_object('id', new_data -> 'id', 'role', new_data -> 'role', 'is_blocked', new_data -> 'is_blocked') end;
  else
    foreach k in array ignored loop
      old_data := old_data - k;
      new_data := new_data - k;
    end loop;
  end if;

  -- Abaikan update yang tidak mengubah kolom bermakna (mis. hanya cache stok).
  if tg_op = 'UPDATE' and old_data = new_data then
    return null;
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, before_data, after_data)
  values (
    actor,
    actor_role,
    lower(tg_op),
    tg_table_name,
    coalesce(new_data ->> 'id', old_data ->> 'id'),
    old_data,
    new_data
  );
  return null;
end;
$$;

revoke execute on function public.audit_row_change() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'vehicle_makes', 'vehicle_models',
    'categories', 'brands', 'products', 'product_variants', 'product_categories',
    'product_images', 'product_fitments', 'product_specs',
    'inventory_movements',
    'vouchers', 'flash_sales', 'flash_sale_items', 'banners',
    'orders', 'payments', 'payment_proofs', 'shipments',
    'returns', 'warranty_claims', 'reviews',
    'store_settings', 'import_batches'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.audit_row_change()',
      t || '_audit', t
    );
  end loop;
end;
$$;
