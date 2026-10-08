-- ============================================================
-- NZO Industries — Fase 6: pembayaran Mayar (D-31)
-- Pelunasan hanya lewat public.mark_order_paid (service role), dipanggil
-- settlePayment() setelah status ditanyakan ulang ke provider.
-- ============================================================

alter table public.payments
  add column method text,
  add column transaction_ref text,
  add constraint payments_method_len check (method is null or char_length(method) <= 40),
  add constraint payments_transaction_ref_len check (
    transaction_ref is null or char_length(transaction_ref) <= 120
  );

-- Satu link bayar aktif per pesanan.
create unique index payments_one_pending_per_order on public.payments (order_id)
  where status = 'pending';
create index payments_transaction_ref_idx on public.payments (transaction_ref)
  where transaction_ref is not null;

-- ------------------------------------------------------------
-- Tandai lunas (idempotent). Hasil:
--   settled | already_paid | amount_mismatch | paid_after_cancel | not_found
-- ------------------------------------------------------------
create or replace function public.mark_order_paid(
  p_payment_id uuid,
  p_amount bigint,
  p_method text default null,
  p_transaction_ref text default null
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  pay public.payments;
  ord public.orders;
begin
  select * into pay from public.payments where id = p_payment_id for update;
  if not found then
    return 'not_found';
  end if;
  if pay.status = 'paid' then
    return 'already_paid';
  end if;
  if p_amount is distinct from pay.amount then
    return 'amount_mismatch';
  end if;

  select * into ord from public.orders where id = pay.order_id for update;

  update public.payments
    set status = 'paid',
        paid_at = now(),
        method = coalesce(left(p_method, 40), method),
        transaction_ref = coalesce(left(p_transaction_ref, 120), transaction_ref)
    where id = pay.id;

  if ord.status <> 'pending_payment' then
    -- Uang masuk setelah pesanan expired/batal: admin memutuskan refund (Fase 8).
    return 'paid_after_cancel';
  end if;

  perform set_config('nzo.status_note', 'Pembayaran diterima (Mayar)', true);
  update public.orders set status = 'paid', paid_at = now() where id = ord.id;
  perform set_config('nzo.status_note', '', true);

  update public.stock_reservations
    set status = 'consumed'
    where order_id = ord.id and status = 'active';

  -- Stok final: ledger 'sale' per item (trigger memperbarui cache stok).
  insert into public.inventory_movements (product_id, variant_id, quantity, type, reason, reference_type, reference_id, created_by)
  select oi.product_id, oi.variant_id, -oi.quantity, 'sale', 'Pesanan ' || ord.order_number, 'order', ord.id, null
  from public.order_items oi
  where oi.order_id = ord.id and oi.product_id is not null;

  perform set_config('nzo.cache_write', 'on', true);
  update public.products p
    set total_sold = p.total_sold + x.q
    from (
      select oi.product_id, sum(oi.quantity)::integer as q
      from public.order_items oi
      where oi.order_id = ord.id and oi.product_id is not null
      group by oi.product_id
    ) x
    where p.id = x.product_id;
  perform set_config('nzo.cache_write', 'off', true);

  insert into public.notifications (user_id, type, title, body, link)
  values (
    ord.user_id,
    'payment_received',
    'Pembayaran diterima',
    'Pembayaran pesanan ' || ord.order_number || ' sudah kami terima. Pesanan segera diproses.',
    '/checkout/success?order=' || ord.order_number
  );

  return 'settled';
end;
$$;

-- ------------------------------------------------------------
-- release_expired_orders: kini juga meng-expire payment pending dan
-- mengembalikan provider_ref supaya cron bisa menutup link Mayar.
-- ------------------------------------------------------------
drop function if exists public.release_expired_orders();

create function public.release_expired_orders()
returns table (order_id uuid, provider_ref text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  r record;
  ref text;
begin
  perform set_config('nzo.status_note', 'Batas waktu pembayaran habis', true);
  for r in
    select o.id from public.orders o
    where o.status = 'pending_payment' and o.payment_due_at < now()
    order by o.payment_due_at
    limit 500
    for update skip locked
  loop
    update public.orders
      set status = 'expired', cancelled_at = now(), cancel_reason = 'Batas waktu pembayaran habis'
      where id = r.id;
    perform private.release_order_holds(r.id);

    ref := null;
    update public.payments p
      set status = 'expired'
      where p.order_id = r.id and p.status = 'pending'
      returning p.provider_ref into ref;

    order_id := r.id;
    provider_ref := ref;
    return next;
  end loop;
  perform set_config('nzo.status_note', '', true);
end;
$$;

revoke all on function public.mark_order_paid(uuid, bigint, text, text) from public, anon, authenticated;
grant execute on function public.mark_order_paid(uuid, bigint, text, text) to service_role;
revoke all on function public.release_expired_orders() from public, anon, authenticated;
grant execute on function public.release_expired_orders() to service_role;
