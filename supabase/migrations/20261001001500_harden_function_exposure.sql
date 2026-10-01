-- ============================================================
-- NZO Industries — 15 hardening dari Supabase advisors
-- 1. Helper policy (SECURITY DEFINER) dipindah ke schema `private` yang tidak
--    diekspos PostgREST, sehingga tidak bisa dipanggil via /rest/v1/rpc.
--    Policy merujuk fungsi lewat OID, jadi tetap berlaku setelah dipindah.
-- 2. Fungsi trigger tidak perlu EXECUTE untuk anon/authenticated.
-- 3. Index untuk foreign key yang belum tercakup.
-- RPC yang memang publik untuk authenticated: set_user_role, set_user_blocked.
-- ============================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

alter function public.is_mfa_verified() set schema private;
alter function public.current_app_role() set schema private;
alter function public.has_role(public.app_role[]) set schema private;
alter function public.is_staff() set schema private;
alter function public.is_product_visible(uuid) set schema private;
alter function public.owns_cart(uuid) set schema private;
alter function public.owns_order(uuid) set schema private;
alter function public.owns_completed_order_item(uuid) set schema private;

-- Body fungsi yang memanggil helper dengan nama lengkap perlu diperbarui.
create or replace function private.has_role(roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select cur.r = any (roles)
        and (cur.r = 'customer'::public.app_role or private.is_mfa_verified())
      from (select private.current_app_role() as r) as cur
    ),
    false
  );
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role(array['owner', 'admin', 'warehouse', 'cs']::public.app_role[]);
$$;

create or replace function public.set_user_role(target_user uuid, new_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_role public.app_role;
begin
  if not private.has_role(array['owner']::public.app_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select role into old_role from public.profiles where id = target_user for update;
  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  if old_role = 'owner' and new_role <> 'owner'
     and (select count(*) from public.profiles where role = 'owner' and deleted_at is null) <= 1 then
    raise exception 'cannot demote the last owner' using errcode = '42501';
  end if;

  update public.profiles set role = new_role where id = target_user;
end;
$$;

create or replace function public.set_user_blocked(target_user uuid, blocked boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.app_role;
begin
  if not private.has_role(array['owner', 'admin']::public.app_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select role into target_role from public.profiles where id = target_user for update;
  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  if target_role <> 'customer' and not private.has_role(array['owner']::public.app_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if target_user = (select auth.uid()) then
    raise exception 'cannot block yourself' using errcode = '42501';
  end if;

  update public.profiles set is_blocked = blocked where id = target_user;
end;
$$;

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_role public.app_role := private.current_app_role();
  old_data jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_data jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  ignored text[] := array[
    'search_vector', 'updated_at', 'stock', 'average_rating', 'review_count', 'total_sold',
    'shipping_address', 'customer_note'
  ];
  k text;
begin
  if coalesce(current_setting('nzo.skip_audit', true), '') = 'on' then
    return null;
  end if;

  if actor is not null and (actor_role is null or actor_role = 'customer') then
    return null;
  end if;

  if tg_table_name = 'profiles' and tg_op = 'INSERT' then
    return null;
  end if;

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

-- Helper policy: dibutuhkan saat evaluasi policy oleh anon/authenticated.
revoke all on all functions in schema private from public;
grant execute on function private.is_mfa_verified() to anon, authenticated;
grant execute on function private.current_app_role() to authenticated;
grant execute on function private.has_role(public.app_role[]) to anon, authenticated;
grant execute on function private.is_staff() to anon, authenticated;
grant execute on function private.is_product_visible(uuid) to anon, authenticated;
grant execute on function private.owns_cart(uuid) to authenticated;
grant execute on function private.owns_order(uuid) to authenticated;
grant execute on function private.owns_completed_order_item(uuid) to authenticated;

-- Fungsi trigger: EXECUTE dicek saat CREATE TRIGGER, bukan saat trigger berjalan.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.products_set_published_at() from public, anon, authenticated;
revoke execute on function public.guard_product_cache_columns() from public, anon, authenticated;
revoke execute on function public.apply_inventory_movement() from public, anon, authenticated;
revoke execute on function public.reject_mutation() from public, anon, authenticated;
revoke execute on function public.orders_set_number() from public, anon, authenticated;
revoke execute on function public.orders_log_status() from public, anon, authenticated;
revoke execute on function public.refresh_product_rating() from public, anon, authenticated;
revoke execute on function public.audit_row_change() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- RPC publik untuk user login saja.
revoke execute on function public.set_user_role(uuid, public.app_role) from public, anon;
revoke execute on function public.set_user_blocked(uuid, boolean) from public, anon;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.set_user_blocked(uuid, boolean) to authenticated;

-- Index foreign key yang belum tercakup.
create index if not exists cart_items_variant_idx on public.cart_items (variant_id);
create index if not exists flash_sale_items_variant_idx on public.flash_sale_items (variant_id);
create index if not exists import_batches_created_by_idx on public.import_batches (created_by);
create index if not exists import_products_product_idx on public.import_products (product_id);
create index if not exists inventory_movements_created_by_idx on public.inventory_movements (created_by);
create index if not exists order_items_variant_idx on public.order_items (variant_id);
create index if not exists order_status_history_changed_by_idx on public.order_status_history (changed_by);
create index if not exists orders_voucher_idx on public.orders (voucher_id);
create index if not exists payment_proofs_payment_idx on public.payment_proofs (payment_id);
create index if not exists payment_proofs_reviewed_by_idx on public.payment_proofs (reviewed_by);
create index if not exists payment_proofs_user_idx on public.payment_proofs (user_id);
create index if not exists returns_order_item_idx on public.returns (order_item_id);
create index if not exists reviews_replied_by_idx on public.reviews (replied_by);
create index if not exists stock_reservations_variant_idx on public.stock_reservations (variant_id);
create index if not exists voucher_redemptions_order_idx on public.voucher_redemptions (order_id);
create index if not exists voucher_redemptions_user_only_idx on public.voucher_redemptions (user_id);
create index if not exists warranty_claims_order_item_idx on public.warranty_claims (order_item_id);
