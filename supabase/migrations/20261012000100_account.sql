-- ============================================================
-- NZO Industries — Fase 7: dashboard user (/account)
-- D-33 voucher publik, D-35 anonimisasi akun, D-36 jendela retur.
-- ============================================================

-- ------------------------------------------------------------
-- D-33: voucher yang sengaja ditampilkan ke pelanggan.
-- ------------------------------------------------------------
alter table public.vouchers add column is_public boolean not null default false;

create policy vouchers_select_public on public.vouchers
  for select to anon, authenticated
  using (
    is_public
    and is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

-- Riwayat voucher user: kode diambil lewat definer, hanya untuk redemption miliknya.
create or replace function public.my_voucher_history()
returns table (
  code text,
  description text,
  discount_amount bigint,
  order_number text,
  used_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select v.code::text, v.description, r.discount_amount, o.order_number, r.created_at
  from public.voucher_redemptions r
  join public.vouchers v on v.id = r.voucher_id
  join public.orders o on o.id = r.order_id
  where r.user_id = (select auth.uid())
  order by r.created_at desc
  limit 100
$$;

-- ------------------------------------------------------------
-- D-36: jendela retur (hari sejak diterima).
-- ------------------------------------------------------------
alter table public.store_settings
  add column return_window_days integer not null default 7,
  add constraint store_settings_return_window check (return_window_days between 0 and 90);

create or replace function private.can_request_return(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders o
    left join public.shipments s on s.order_id = o.id
    cross join (select return_window_days from public.store_settings where id) cfg
    where o.id = p_order_id
      and o.user_id = (select auth.uid())
      and o.status in ('delivered', 'completed')
      and coalesce(s.delivered_at, o.updated_at) + make_interval(days => cfg.return_window_days) > now()
  );
$$;

drop policy returns_insert_own on public.returns;
create policy returns_insert_own on public.returns
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.can_request_return(order_id)
    and (
      order_item_id is null
      or exists (select 1 from public.order_items oi where oi.id = order_item_id and oi.order_id = returns.order_id)
    )
    and status = 'requested'
    and admin_note is null
    and resolution is null
    and return_awb is null
  );

-- ------------------------------------------------------------
-- Batalkan pesanan sendiri yang belum dibayar.
-- ------------------------------------------------------------
create or replace function public.cancel_my_order(p_order_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  ord public.orders;
  ref text;
begin
  select * into ord from public.orders
    where id = p_order_id and user_id = (select auth.uid())
    for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan.' using errcode = 'P0001';
  end if;
  if ord.status <> 'pending_payment' then
    raise exception 'Hanya pesanan yang belum dibayar yang bisa dibatalkan.' using errcode = 'P0001';
  end if;

  perform set_config('nzo.status_note', 'Dibatalkan pembeli', true);
  update public.orders
    set status = 'cancelled', cancelled_at = now(), cancel_reason = 'Dibatalkan pembeli'
    where id = ord.id;
  perform set_config('nzo.status_note', '', true);
  perform private.release_order_holds(ord.id);

  update public.payments p
    set status = 'cancelled'
    where p.order_id = ord.id and p.status = 'pending'
    returning p.provider_ref into ref;
  return ref;
end;
$$;

-- Konfirmasi pesanan diterima oleh pembeli.
create or replace function public.complete_my_order(p_order_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  ord public.orders;
begin
  select * into ord from public.orders
    where id = p_order_id and user_id = (select auth.uid())
    for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan.' using errcode = 'P0001';
  end if;
  if ord.status not in ('shipped', 'delivered') then
    raise exception 'Pesanan belum dikirim.' using errcode = 'P0001';
  end if;

  perform set_config('nzo.status_note', 'Dikonfirmasi diterima oleh pembeli', true);
  update public.orders set status = 'completed' where id = ord.id;
  perform set_config('nzo.status_note', '', true);
  update public.shipments
    set status = 'delivered', delivered_at = coalesce(delivered_at, now())
    where order_id = ord.id;
end;
$$;

-- ------------------------------------------------------------
-- D-35: anonimisasi akun (bagian DB). Auth (email alias, ban, sign out)
-- dikerjakan server dengan service role setelah fungsi ini sukses.
-- ------------------------------------------------------------
create or replace function public.anonymize_my_account()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Tidak masuk.' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = uid and role <> 'customer') then
    raise exception 'Akun staf tidak bisa dihapus sendiri.' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.orders
    where user_id = uid and status in ('paid', 'processing', 'shipped')
  ) then
    raise exception 'Masih ada pesanan yang sedang diproses. Tunggu sampai selesai.' using errcode = 'P0001';
  end if;

  -- Pesanan belum dibayar dibatalkan supaya stok kembali.
  perform set_config('nzo.status_note', 'Akun dihapus pemilik', true);
  update public.orders
    set status = 'cancelled', cancelled_at = now(), cancel_reason = 'Akun dihapus'
    where user_id = uid and status = 'pending_payment';
  perform private.release_order_holds(o.id)
    from public.orders o where o.user_id = uid and o.cancel_reason = 'Akun dihapus';
  update public.payments p set status = 'cancelled'
    from public.orders o
    where o.id = p.order_id and o.user_id = uid and p.status = 'pending';
  perform set_config('nzo.status_note', '', true);

  delete from public.addresses where user_id = uid;
  delete from public.user_vehicles where user_id = uid;
  delete from public.wishlists where user_id = uid;
  delete from public.carts where user_id = uid;
  delete from public.notifications where user_id = uid;

  update public.profiles
    set full_name = null, phone = null, avatar_url = null, deleted_at = now()
    where id = uid;
end;
$$;

revoke all on function private.can_request_return(uuid) from public, anon;
grant execute on function private.can_request_return(uuid) to authenticated, service_role;

revoke all on function public.my_voucher_history() from public, anon;
revoke all on function public.cancel_my_order(uuid) from public, anon;
revoke all on function public.complete_my_order(uuid) from public, anon;
revoke all on function public.anonymize_my_account() from public, anon;
grant execute on function public.my_voucher_history() to authenticated;
grant execute on function public.cancel_my_order(uuid) to authenticated;
grant execute on function public.complete_my_order(uuid) to authenticated;
grant execute on function public.anonymize_my_account() to authenticated;
