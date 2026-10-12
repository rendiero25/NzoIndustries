-- ============================================================
-- NZO Industries — Fase 8A: admin operasional (D-37, D-40)
-- Semua RPC security definer dan mengecek role di dalam fungsi.
-- ============================================================

-- ------------------------------------------------------------
-- Statistik beranda admin.
-- ------------------------------------------------------------
create or replace function public.admin_dashboard_stats(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  paid_states public.order_status[] := array['paid', 'processing', 'shipped', 'delivered', 'completed']::public.order_status[];
  days integer := greatest(7, least(coalesce(p_days, 30), 90));
  tz text := 'Asia/Jakarta';
  today date := (now() at time zone tz)::date;
  threshold integer;
  result jsonb;
begin
  if not private.is_staff() then
    raise exception 'Akses ditolak.' using errcode = '42501';
  end if;
  select low_stock_threshold into threshold from public.store_settings where id;

  select jsonb_build_object(
    'sales_today', coalesce((select sum(grand_total) from public.orders
      where status = any(paid_states) and (paid_at at time zone tz)::date = today), 0),
    'sales_7d', coalesce((select sum(grand_total) from public.orders
      where status = any(paid_states) and (paid_at at time zone tz)::date > today - 7), 0),
    'sales_30d', coalesce((select sum(grand_total) from public.orders
      where status = any(paid_states) and (paid_at at time zone tz)::date > today - 30), 0),
    'orders_30d', (select count(*) from public.orders
      where status = any(paid_states) and (paid_at at time zone tz)::date > today - 30),
    'by_status', coalesce((select jsonb_object_agg(status, n) from (
      select status, count(*) as n from public.orders group by status) s), '{}'::jsonb),
    'series', (select coalesce(jsonb_agg(jsonb_build_object('date', d::date, 'revenue', coalesce(x.revenue, 0), 'orders', coalesce(x.orders, 0)) order by d), '[]'::jsonb)
      from generate_series(today - (days - 1), today, interval '1 day') d
      left join (
        select (paid_at at time zone tz)::date as paid_day, sum(grand_total) as revenue, count(*) as orders
        from public.orders
        where status = any(paid_states) and (paid_at at time zone tz)::date > today - days
        group by 1
      ) x on x.paid_day = d::date),
    'top_products', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
      select oi.product_id, max(oi.product_name) as name, sum(oi.quantity)::integer as qty, sum(oi.line_total) as revenue
      from public.order_items oi join public.orders o on o.id = oi.order_id
      where o.status = any(paid_states) and (o.paid_at at time zone tz)::date > today - 30
      group by oi.product_id order by qty desc limit 5) t),
    'low_stock_count', (select count(*) from public.products
      where status = 'published' and stock <= threshold),
    'low_stock', (select coalesce(jsonb_agg(l), '[]'::jsonb) from (
      select id, name, sku, stock from public.products
      where status = 'published' and stock <= threshold and stock > 0
      order by stock asc, name limit 8) l),
    'threshold', threshold
  ) into result;
  return result;
end;
$$;

-- ------------------------------------------------------------
-- Ubah status pesanan (matriks transisi admin).
--   processing  : dari paid
--   shipped     : dari paid/processing, wajib nomor resi
--   delivered   : dari shipped
--   completed   : dari delivered
--   cancelled   : dari pending_payment (lepas reservasi)
--   refunded    : dari paid/processing (stok kembali), owner/admin
--   paid        : aktifkan ulang pesanan expired/cancelled yang sudah dibayar
--                 (paid_after_cancel), owner/admin, stok harus cukup
-- ------------------------------------------------------------
create or replace function public.admin_set_order_status(
  p_order_id uuid,
  p_to public.order_status,
  p_note text default null,
  p_courier_code text default null,
  p_waybill text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  ord public.orders;
  managers boolean := private.has_role(array['owner', 'admin']::public.app_role[]);
  title text;
  body text;
  note text := nullif(btrim(p_note), '');
begin
  if not private.has_role(array['owner', 'admin', 'warehouse']::public.app_role[]) then
    raise exception 'Akses ditolak.' using errcode = '42501';
  end if;

  select * into ord from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan.' using errcode = 'P0001';
  end if;

  if not (
    (p_to = 'processing' and ord.status = 'paid')
    or (p_to = 'shipped' and ord.status in ('paid', 'processing'))
    or (p_to = 'delivered' and ord.status = 'shipped')
    or (p_to = 'completed' and ord.status = 'delivered')
    or (p_to = 'cancelled' and ord.status = 'pending_payment')
    or (p_to = 'refunded' and ord.status in ('paid', 'processing') and managers)
    or (p_to = 'paid' and ord.status in ('expired', 'cancelled') and managers
        and exists (select 1 from public.payments p where p.order_id = ord.id and p.status = 'paid'))
  ) then
    raise exception 'Perubahan status dari % ke % tidak diizinkan.', ord.status, p_to using errcode = 'P0001';
  end if;

  if p_to = 'shipped' and nullif(btrim(p_waybill), '') is null then
    raise exception 'Nomor resi wajib diisi.' using errcode = 'P0001';
  end if;

  perform set_config('nzo.status_note', coalesce(note, ''), true);

  if p_to = 'cancelled' then
    update public.orders set status = 'cancelled', cancelled_at = now(),
      cancel_reason = coalesce(note, 'Dibatalkan admin') where id = ord.id;
    perform private.release_order_holds(ord.id);
    update public.payments set status = 'cancelled' where order_id = ord.id and status = 'pending';
  elsif p_to = 'refunded' then
    update public.orders set status = 'refunded', cancelled_at = now(),
      cancel_reason = coalesce(note, 'Refund oleh admin') where id = ord.id;
    -- Barang belum dikirim: stok kembali lewat ledger.
    insert into public.inventory_movements (product_id, variant_id, quantity, type, reason, reference_type, reference_id)
    select oi.product_id, oi.variant_id, oi.quantity, 'return', 'Refund pesanan ' || ord.order_number, 'order', ord.id
    from public.order_items oi where oi.order_id = ord.id and oi.product_id is not null;
    update public.payments set status = 'refunded' where order_id = ord.id and status = 'paid';
  elsif p_to = 'paid' then
    -- Aktifkan ulang: stok final diambil sekarang (gagal bila stok tidak cukup).
    insert into public.inventory_movements (product_id, variant_id, quantity, type, reason, reference_type, reference_id)
    select oi.product_id, oi.variant_id, -oi.quantity, 'sale', 'Aktifkan ulang ' || ord.order_number, 'order', ord.id
    from public.order_items oi where oi.order_id = ord.id and oi.product_id is not null;
    update public.orders set status = 'paid', cancelled_at = null, cancel_reason = null,
      paid_at = coalesce(paid_at, now()) where id = ord.id;
  else
    update public.orders set status = p_to where id = ord.id;
  end if;

  if p_to = 'shipped' then
    update public.shipments set
      waybill_number = btrim(p_waybill),
      courier_code = coalesce(nullif(btrim(p_courier_code), ''), courier_code),
      status = 'picked',
      shipped_at = coalesce(shipped_at, now())
    where order_id = ord.id;
  elsif p_to in ('delivered', 'completed') then
    update public.shipments set status = 'delivered', delivered_at = coalesce(delivered_at, now())
    where order_id = ord.id;
  end if;

  perform set_config('nzo.status_note', '', true);

  title := case p_to
    when 'processing' then 'Pesanan diproses'
    when 'shipped' then 'Pesanan dikirim'
    when 'delivered' then 'Pesanan sampai'
    when 'completed' then 'Pesanan selesai'
    when 'cancelled' then 'Pesanan dibatalkan'
    when 'refunded' then 'Dana pesanan dikembalikan'
    when 'paid' then 'Pesanan diaktifkan kembali'
  end;
  body := case p_to
    when 'shipped' then 'Pesanan ' || ord.order_number || ' dikirim dengan resi ' || btrim(p_waybill) || '.'
    when 'delivered' then 'Pesanan ' || ord.order_number || ' sudah sampai. Konfirmasi bila barang sudah kamu terima.'
    else 'Status pesanan ' || ord.order_number || ' diperbarui.' || coalesce(' ' || note, '')
  end;
  insert into public.notifications (user_id, type, title, body, link)
  values (ord.user_id, 'order_status', title, body, '/account/orders/' || ord.order_number);
end;
$$;

-- ------------------------------------------------------------
-- Notifikasi stok menipis ke owner/admin saat stok melewati ambang (turun).
-- ------------------------------------------------------------
create or replace function private.notify_low_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  threshold integer;
  current_stock integer;
  pname text;
begin
  if new.quantity >= 0 then
    return null;
  end if;
  select low_stock_threshold into threshold from public.store_settings where id;
  if new.variant_id is not null then
    select v.stock, p.name || ' · ' || v.name into current_stock, pname
    from public.product_variants v join public.products p on p.id = v.product_id
    where v.id = new.variant_id;
  else
    select stock, name into current_stock, pname from public.products where id = new.product_id;
  end if;
  if current_stock <= threshold and current_stock - new.quantity > threshold then
    insert into public.notifications (user_id, type, title, body, link)
    select pr.id, 'low_stock', 'Stok menipis',
      pname || ' tersisa ' || current_stock || '.', '/admin/stock?q=' || new.product_id
    from public.profiles pr
    where pr.role in ('owner', 'admin') and pr.deleted_at is null;
  end if;
  return null;
end;
$$;

create trigger inventory_movements_low_stock
  after insert on public.inventory_movements
  for each row execute function private.notify_low_stock();

revoke all on function public.admin_dashboard_stats(integer) from public, anon;
revoke all on function public.admin_set_order_status(uuid, public.order_status, text, text, text) from public, anon;
grant execute on function public.admin_dashboard_stats(integer) to authenticated;
grant execute on function public.admin_set_order_status(uuid, public.order_status, text, text, text) to authenticated;
