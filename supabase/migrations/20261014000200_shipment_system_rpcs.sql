-- Fase 8E: ganti webhook Biteship & cron auto-selesai legacy dengan RPC NZO.
-- Hanya service_role (dipanggil route handler setelah verifikasi token/secret).

create or replace function public.system_apply_shipment_update(
  p_biteship_order_id text,
  p_status text,
  p_waybill text default null,
  p_at timestamptz default now()
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  shp public.shipments;
  ord public.orders;
  v_status public.shipment_status;
  v_raw text := lower(btrim(coalesce(p_status, '')));
begin
  v_status := case v_raw
    when 'confirmed' then 'confirmed'
    when 'allocated' then 'allocated'
    when 'picking_up' then 'picking_up'
    when 'picked' then 'picked'
    when 'dropping_off' then 'dropping_off'
    when 'delivered' then 'delivered'
    when 'rejected' then 'rejected'
    when 'cancelled' then 'cancelled'
    when 'canceled' then 'cancelled'
    when 'return' then 'returned'
    when 'returned' then 'returned'
    else null
  end::public.shipment_status;
  if v_status is null then
    return 'ignored_status';
  end if;

  select * into shp from public.shipments where biteship_order_id = p_biteship_order_id for update;
  if not found then
    return 'unknown_shipment';
  end if;

  update public.shipments set
    status = v_status,
    waybill_number = coalesce(nullif(btrim(p_waybill), ''), waybill_number),
    shipped_at = case when v_status in ('picked', 'dropping_off') then coalesce(shipped_at, p_at) else shipped_at end,
    delivered_at = case when v_status = 'delivered' then coalesce(delivered_at, p_at) else delivered_at end
  where id = shp.id;

  select * into ord from public.orders where id = shp.order_id for update;

  if v_status in ('picked', 'dropping_off') and ord.status in ('paid', 'processing') then
    perform set_config('nzo.status_note', 'Otomatis dari kurir: ' || v_raw, true);
    update public.orders set status = 'shipped' where id = ord.id;
    insert into public.notifications (user_id, type, title, body, link)
    values (ord.user_id, 'order_status', 'Pesanan dikirim',
      'Pesanan ' || ord.order_number || ' sedang dalam perjalanan.', '/account/orders/' || ord.order_number);
  elsif v_status = 'delivered' and ord.status in ('paid', 'processing', 'shipped') then
    perform set_config('nzo.status_note', 'Otomatis dari kurir: delivered', true);
    update public.orders set status = 'delivered' where id = ord.id;
    insert into public.notifications (user_id, type, title, body, link)
    values (ord.user_id, 'order_status', 'Pesanan sampai',
      'Pesanan ' || ord.order_number || ' sudah diterima. Konfirmasi atau beri ulasan.', '/account/orders/' || ord.order_number);
  end if;

  return 'applied';
end;
$$;

-- Pesanan "delivered" lebih dari p_days hari otomatis selesai.
create or replace function public.system_complete_delivered_orders(p_days integer default 3)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform set_config('nzo.status_note', 'Otomatis selesai ' || p_days || ' hari setelah diterima', true);
  with due as (
    select o.id
      from public.orders o
      left join public.shipments s on s.order_id = o.id
     where o.status = 'delivered'
       and coalesce(s.delivered_at, o.updated_at) < now() - make_interval(days => greatest(p_days, 1))
     for update of o
  )
  update public.orders o set status = 'completed'
    from due where o.id = due.id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.system_apply_shipment_update(text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.system_complete_delivered_orders(integer) from public, anon, authenticated;
grant execute on function public.system_apply_shipment_update(text, text, text, timestamptz) to service_role;
grant execute on function public.system_complete_delivered_orders(integer) to service_role;
