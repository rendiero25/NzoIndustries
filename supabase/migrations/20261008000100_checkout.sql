-- ============================================================
-- NZO Industries — Fase 5: keranjang & checkout
-- Harga, stok tersedia, voucher, dan flash sale dihitung di DB (security rule 4).
-- Pesanan hanya dibuat lewat public.place_order oleh server (service role):
-- ongkir diambil ulang server dari ShippingProvider, bukan dari client (D-29).
-- ============================================================

-- Idempotency submit checkout (klik ganda / retry jaringan).
alter table public.orders add column checkout_key uuid unique;

-- Item mana yang memakai kuota flash sale (untuk mengembalikan kuota saat expired).
alter table public.order_items
  add column flash_sale_item_id uuid references public.flash_sale_items (id) on delete set null;

-- ------------------------------------------------------------
-- Stok tersedia = stok cache − reservasi aktif yang belum kedaluwarsa.
-- Reservasi lewat batas waktu tidak menahan stok walau cron terlambat.
-- ------------------------------------------------------------
create or replace function private.available_stock(p_product_id uuid, p_variant_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    0,
    coalesce(
      case
        when p_variant_id is null then (select p.stock from public.products p where p.id = p_product_id)
        else (
          select v.stock from public.product_variants v
          where v.id = p_variant_id and v.product_id = p_product_id
        )
      end,
      0
    )
    - coalesce((
      select sum(r.quantity)
      from public.stock_reservations r
      where r.product_id = p_product_id
        and r.variant_id is not distinct from p_variant_id
        and r.status = 'active'
        and r.expires_at > now()
    ), 0)
  )::integer
$$;

-- ------------------------------------------------------------
-- Sumber tunggal harga per baris keranjang.
-- p_items: [{ "product_id": uuid, "variant_id": uuid|null, "quantity": int }]
-- status: ok | insufficient | unavailable
-- ------------------------------------------------------------
create or replace function private.price_lines(p_items jsonb)
returns table (
  line_no             integer,
  product_id          uuid,
  variant_id          uuid,
  slug                text,
  product_name        text,
  variant_name        text,
  sku                 text,
  image_public_id     text,
  unit_price          bigint,
  regular_price       bigint,
  compare_at_price    bigint,
  flash_sale_item_id  uuid,
  quantity            integer,
  available           integer,
  weight_grams        integer,
  length_mm           integer,
  width_mm            integer,
  height_mm           integer,
  status              text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 100 then
    raise exception 'Data keranjang tidak valid.' using errcode = '22023';
  end if;

  return query
  with raw as (
    select
      t.ord,
      (t.e ->> 'product_id')::uuid as product_id,
      nullif(t.e ->> 'variant_id', '')::uuid as variant_id,
      greatest(1, least(999, coalesce((t.e ->> 'quantity')::integer, 1))) as quantity
    from jsonb_array_elements(p_items) with ordinality as t (e, ord)
  ),
  req as (
    select min(r.ord)::integer as line_no, r.product_id, r.variant_id,
           least(999, sum(r.quantity))::integer as quantity
    from raw r
    group by r.product_id, r.variant_id
  ),
  base as (
    select
      r.line_no,
      r.product_id,
      r.variant_id,
      r.quantity,
      p.slug,
      p.name as product_name,
      v.name as variant_name,
      coalesce(v.sku, p.sku) as sku,
      coalesce(
        v.image_public_id,
        (
          select i.public_id from public.product_images i
          where i.product_id = p.id
          order by (i.variant_id is not distinct from r.variant_id and r.variant_id is not null) desc,
                   i.sort_order
          limit 1
        )
      ) as image_public_id,
      case when v.price is not null then v.price else p.price end as regular_price,
      case when v.price is not null then v.compare_at_price else p.compare_at_price end as compare_at_price,
      coalesce(v.weight_grams, p.weight_grams) as weight_grams,
      p.length_mm,
      p.width_mm,
      p.height_mm,
      case
        when p.id is null then false
        when r.variant_id is null then not exists (
          select 1 from public.product_variants x where x.product_id = p.id and x.is_active
        )
        else v.id is not null and v.is_active
      end as sellable
    from req r
    left join public.products p on p.id = r.product_id and p.status = 'published'
    left join public.product_variants v on v.id = r.variant_id and v.product_id = r.product_id
  )
  select
    b.line_no,
    b.product_id,
    b.variant_id,
    b.slug,
    b.product_name,
    b.variant_name,
    b.sku,
    b.image_public_id,
    coalesce(f.sale_price, b.regular_price) as unit_price,
    b.regular_price,
    case when f.id is not null then b.regular_price else b.compare_at_price end as compare_at_price,
    f.id as flash_sale_item_id,
    b.quantity,
    s.available,
    b.weight_grams,
    b.length_mm,
    b.width_mm,
    b.height_mm,
    case
      when not b.sellable then 'unavailable'
      when s.available < b.quantity then 'insufficient'
      else 'ok'
    end as status
  from base b
  cross join lateral (
    select case when b.sellable then private.available_stock(b.product_id, b.variant_id) else 0 end as available
  ) s
  left join lateral (
    select fi.id, fi.sale_price
    from public.flash_sale_items fi
    join public.flash_sales fs on fs.id = fi.flash_sale_id
    where b.sellable
      and fs.is_active
      and fs.starts_at <= now()
      and fs.ends_at > now()
      and fi.product_id = b.product_id
      and (fi.variant_id is null or fi.variant_id = b.variant_id)
      and (fi.quota is null or fi.sold + b.quantity <= fi.quota)
      and fi.sale_price < b.regular_price
    order by fi.sale_price
    limit 1
  ) f on true
  order by b.line_no;
end;
$$;

-- ------------------------------------------------------------
-- Validasi voucher + hitung diskon. message <> null = voucher ditolak.
-- p_lock: kunci baris voucher (dipakai saat membuat pesanan).
-- ------------------------------------------------------------
create or replace function private.apply_voucher(
  p_user uuid,
  p_code text,
  p_subtotal bigint,
  p_lock boolean default false
)
returns table (voucher_id uuid, discount bigint, message text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v public.vouchers;
  used integer;
  amount bigint;
begin
  if p_code is null or btrim(p_code) = '' then
    return query select null::uuid, 0::bigint, null::text;
    return;
  end if;

  if p_lock then
    select * into v from public.vouchers x where lower(x.code::text) = lower(btrim(p_code)) for update;
  else
    select * into v from public.vouchers x where lower(x.code::text) = lower(btrim(p_code));
  end if;

  if not found or not v.is_active then
    return query select null::uuid, 0::bigint, 'Kode voucher tidak ditemukan.'::text;
    return;
  end if;
  if v.starts_at is not null and v.starts_at > now() then
    return query select null::uuid, 0::bigint, 'Voucher belum berlaku.'::text;
    return;
  end if;
  if v.ends_at is not null and v.ends_at <= now() then
    return query select null::uuid, 0::bigint, 'Voucher sudah berakhir.'::text;
    return;
  end if;
  if p_subtotal < v.min_subtotal then
    return query select null::uuid, 0::bigint,
      ('Minimal belanja Rp ' || replace(to_char(v.min_subtotal, 'FM999,999,999,999'), ',', '.')
        || ' untuk voucher ini.')::text;
    return;
  end if;
  if v.usage_limit is not null and v.used_count >= v.usage_limit then
    return query select null::uuid, 0::bigint, 'Kuota voucher sudah habis.'::text;
    return;
  end if;

  select count(*) into used
  from public.voucher_redemptions r
  where r.voucher_id = v.id and r.user_id = p_user;
  if used >= v.per_user_limit then
    return query select null::uuid, 0::bigint, 'Kamu sudah memakai voucher ini.'::text;
    return;
  end if;

  amount := case
    when v.discount_type = 'percent' then floor(p_subtotal * v.discount_value / 100.0)::bigint
    else v.discount_value
  end;
  if v.max_discount is not null then
    amount := least(amount, v.max_discount);
  end if;
  amount := greatest(0, least(amount, p_subtotal));

  return query select v.id, amount, null::text;
end;
$$;

-- ------------------------------------------------------------
-- Lepas semua yang ditahan pesanan (reservasi, kuota flash sale, voucher).
-- Dipakai expired (cron) dan pembatalan (Fase 6/7/8).
-- ------------------------------------------------------------
create or replace function private.release_order_holds(p_order_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_voucher uuid;
begin
  update public.stock_reservations
    set status = 'released'
    where order_id = p_order_id and status = 'active';

  update public.flash_sale_items fi
    set sold = greatest(0, fi.sold - x.q)
    from (
      select oi.flash_sale_item_id, sum(oi.quantity)::integer as q
      from public.order_items oi
      where oi.order_id = p_order_id and oi.flash_sale_item_id is not null
      group by oi.flash_sale_item_id
    ) x
    where fi.id = x.flash_sale_item_id;

  delete from public.voucher_redemptions r
    where r.order_id = p_order_id
    returning r.voucher_id into v_voucher;
  if v_voucher is not null then
    update public.vouchers set used_count = greatest(0, used_count - 1) where id = v_voucher;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- Keranjang untuk tampilan (anon & login): harga + stok tersedia terkini.
-- Produk non-published muncul sebagai 'unavailable' tanpa data.
-- ------------------------------------------------------------
create or replace function public.cart_lines(p_items jsonb)
returns table (
  line_no             integer,
  product_id          uuid,
  variant_id          uuid,
  slug                text,
  product_name        text,
  variant_name        text,
  sku                 text,
  image_public_id     text,
  unit_price          bigint,
  regular_price       bigint,
  compare_at_price    bigint,
  flash_sale_item_id  uuid,
  quantity            integer,
  available           integer,
  weight_grams        integer,
  length_mm           integer,
  width_mm            integer,
  height_mm           integer,
  status              text
)
language sql
stable
security definer
set search_path = ''
as $$
  select * from private.price_lines(p_items)
$$;

-- ------------------------------------------------------------
-- Ringkasan checkout (server saja): baris, subtotal, hemat flash sale, voucher.
-- ------------------------------------------------------------
create or replace function public.checkout_quote(p_user uuid, p_items jsonb, p_voucher_code text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_lines jsonb;
  v_subtotal bigint;
  v_savings bigint;
  v_ok boolean;
  v record;
begin
  select
    coalesce(jsonb_agg(to_jsonb(l) order by l.line_no), '[]'::jsonb),
    coalesce(sum(l.unit_price * l.quantity) filter (where l.status = 'ok'), 0),
    coalesce(sum((l.regular_price - l.unit_price) * l.quantity) filter (where l.status = 'ok'), 0),
    coalesce(bool_and(l.status = 'ok'), false)
  into v_lines, v_subtotal, v_savings, v_ok
  from private.price_lines(p_items) l;

  select * into v from private.apply_voucher(p_user, p_voucher_code, v_subtotal, false);

  return jsonb_build_object(
    'lines', v_lines,
    'all_ok', v_ok,
    'subtotal', v_subtotal,
    'flash_savings', v_savings,
    'voucher_id', v.voucher_id,
    'discount', coalesce(v.discount, 0),
    'voucher_message', v.message
  );
end;
$$;

-- ------------------------------------------------------------
-- Buat pesanan (server saja). Satu transaksi: kunci stok, hitung ulang,
-- voucher, order + item + reservasi + pengiriman, kosongkan baris keranjang.
-- p_address  : snapshot alamat (object)
-- p_shipping : { courier_code, courier_service, cost } dari tarif server
-- ------------------------------------------------------------
create or replace function public.place_order(
  p_user uuid,
  p_checkout_key uuid,
  p_items jsonb,
  p_address jsonb,
  p_shipping jsonb,
  p_voucher_code text,
  p_payment_provider public.payment_provider,
  p_note text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  existing record;
  settings public.store_settings;
  v_lines jsonb;
  v_subtotal bigint;
  v_bad integer;
  v_voucher record;
  v_ship bigint;
  v_courier text;
  v_service text;
  v_due timestamptz;
  v_order_id uuid;
  v_number text;
begin
  if p_user is null or p_checkout_key is null then
    raise exception 'Data checkout tidak lengkap.' using errcode = '22023';
  end if;

  select o.id, o.order_number into existing from public.orders o where o.checkout_key = p_checkout_key;
  if found then
    return jsonb_build_object('order_id', existing.id, 'order_number', existing.order_number, 'created', false);
  end if;

  if exists (select 1 from public.profiles pr where pr.id = p_user and (pr.is_blocked or pr.deleted_at is not null)) then
    raise exception 'Akun tidak dapat membuat pesanan.' using errcode = 'P0001';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang kosong.' using errcode = 'P0001';
  end if;
  if p_address is null or jsonb_typeof(p_address) <> 'object' then
    raise exception 'Alamat pengiriman tidak valid.' using errcode = 'P0001';
  end if;

  v_courier := nullif(btrim(p_shipping ->> 'courier_code'), '');
  v_service := nullif(btrim(p_shipping ->> 'courier_service'), '');
  v_ship := (p_shipping ->> 'cost')::bigint;
  if v_courier is null or v_service is null or v_ship is null or v_ship < 0 then
    raise exception 'Pilih kurir pengiriman.' using errcode = 'P0001';
  end if;

  select * into settings from public.store_settings where id;
  if p_payment_provider is null
    or (p_payment_provider = 'mayar' and not settings.mayar_enabled)
    or (p_payment_provider = 'manual_transfer' and not settings.manual_transfer_enabled) then
    raise exception 'Metode pembayaran tidak tersedia.' using errcode = 'P0001';
  end if;

  -- Kunci stok (urutan id, mencegah deadlock) sebelum menghitung ketersediaan.
  perform 1 from public.products p
    where p.id in (select (e ->> 'product_id')::uuid from jsonb_array_elements(p_items) e)
    order by p.id
    for update;
  perform 1 from public.product_variants pv
    where pv.id in (select nullif(e ->> 'variant_id', '')::uuid from jsonb_array_elements(p_items) e)
    order by pv.id
    for update;

  select
    coalesce(jsonb_agg(to_jsonb(l) order by l.line_no), '[]'::jsonb),
    coalesce(sum(l.unit_price * l.quantity), 0),
    count(*) filter (where l.status <> 'ok')
  into v_lines, v_subtotal, v_bad
  from private.price_lines(p_items) l;

  if v_bad > 0 then
    raise exception 'Stok atau ketersediaan produk berubah. Periksa keranjang kamu.' using errcode = 'P0001';
  end if;

  select * into v_voucher from private.apply_voucher(p_user, p_voucher_code, v_subtotal, true);
  if v_voucher.message is not null then
    raise exception '%', v_voucher.message using errcode = 'P0001';
  end if;

  v_due := now() + make_interval(mins => settings.payment_timeout_minutes);

  perform set_config('nzo.status_note', 'Pesanan dibuat', true);
  insert into public.orders (
    user_id, subtotal, shipping_cost, discount_total, unique_code, grand_total,
    voucher_id, payment_provider, shipping_address, customer_note, payment_due_at, checkout_key
  ) values (
    p_user, v_subtotal, v_ship, v_voucher.discount, 0,
    v_subtotal + v_ship - v_voucher.discount,
    v_voucher.voucher_id, p_payment_provider, p_address,
    nullif(btrim(p_note), ''), v_due, p_checkout_key
  )
  returning id, order_number into v_order_id, v_number;
  perform set_config('nzo.status_note', '', true);

  insert into public.order_items (
    order_id, product_id, variant_id, product_name, variant_name, sku,
    unit_price, quantity, line_total, weight_grams, flash_sale_item_id
  )
  select v_order_id, l.product_id, l.variant_id, l.product_name, l.variant_name, l.sku,
         l.unit_price, l.quantity, l.unit_price * l.quantity, l.weight_grams, l.flash_sale_item_id
  from jsonb_to_recordset(v_lines) as l (
    line_no integer, product_id uuid, variant_id uuid, product_name text, variant_name text,
    sku text, unit_price bigint, quantity integer, weight_grams integer, flash_sale_item_id uuid
  )
  order by l.line_no;

  insert into public.stock_reservations (order_id, product_id, variant_id, quantity, expires_at)
  select v_order_id, l.product_id, l.variant_id, l.quantity, v_due
  from jsonb_to_recordset(v_lines) as l (product_id uuid, variant_id uuid, quantity integer);

  update public.flash_sale_items fi
    set sold = fi.sold + x.q
    from (
      select l.flash_sale_item_id, sum(l.quantity)::integer as q
      from jsonb_to_recordset(v_lines) as l (flash_sale_item_id uuid, quantity integer)
      where l.flash_sale_item_id is not null
      group by l.flash_sale_item_id
    ) x
    where fi.id = x.flash_sale_item_id;

  if v_voucher.voucher_id is not null then
    insert into public.voucher_redemptions (voucher_id, user_id, order_id, discount_amount)
      values (v_voucher.voucher_id, p_user, v_order_id, v_voucher.discount);
    update public.vouchers set used_count = used_count + 1 where id = v_voucher.voucher_id;
  end if;

  insert into public.shipments (order_id, courier_code, courier_service, cost)
    values (v_order_id, v_courier, v_service, v_ship);

  delete from public.cart_items ci
    using public.carts c
    where c.id = ci.cart_id
      and c.user_id = p_user
      and exists (
        select 1 from jsonb_to_recordset(v_lines) as l (product_id uuid, variant_id uuid)
        where l.product_id = ci.product_id and l.variant_id is not distinct from ci.variant_id
      );

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_number, 'created', true);
end;
$$;

-- ------------------------------------------------------------
-- Cron: pesanan pending_payment lewat batas bayar → expired + lepas tahanan.
-- ------------------------------------------------------------
create or replace function public.release_expired_orders()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r record;
  n integer := 0;
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
    n := n + 1;
  end loop;
  perform set_config('nzo.status_note', '', true);
  return n;
end;
$$;

-- ------------------------------------------------------------
-- Hak eksekusi: helper & RPC tulis hanya service role.
-- cart_lines publik (hanya data published).
-- ------------------------------------------------------------
revoke all on function private.available_stock(uuid, uuid) from public, anon, authenticated;
revoke all on function private.price_lines(jsonb) from public, anon, authenticated;
revoke all on function private.apply_voucher(uuid, text, bigint, boolean) from public, anon, authenticated;
revoke all on function private.release_order_holds(uuid) from public, anon, authenticated;
grant execute on function private.available_stock(uuid, uuid) to service_role;
grant execute on function private.price_lines(jsonb) to service_role;
grant execute on function private.apply_voucher(uuid, text, bigint, boolean) to service_role;
grant execute on function private.release_order_holds(uuid) to service_role;

revoke all on function public.cart_lines(jsonb) from public;
grant execute on function public.cart_lines(jsonb) to anon, authenticated, service_role;

revoke all on function public.checkout_quote(uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.place_order(uuid, uuid, jsonb, jsonb, jsonb, text, public.payment_provider, text)
  from public, anon, authenticated;
revoke all on function public.release_expired_orders() from public, anon, authenticated;
grant execute on function public.checkout_quote(uuid, jsonb, text) to service_role;
grant execute on function public.place_order(uuid, uuid, jsonb, jsonb, jsonb, text, public.payment_provider, text)
  to service_role;
grant execute on function public.release_expired_orders() to service_role;
