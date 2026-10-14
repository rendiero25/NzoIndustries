-- Fase 8E: administrasi admin (laporan, staf, audit).
-- Pengaturan toko tetap lewat RLS store_settings (update owner saja).

-- Laporan penjualan per periode (tanggal WIB, inklusif). Pesanan dihitung
-- bila sudah dibayar (paid ke atas, tanpa refunded/cancelled/expired).
create or replace function public.admin_sales_report(
  p_from date,
  p_to date,
  p_group text default 'day'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
  v_result jsonb;
begin
  if not private.has_role(array['owner', 'admin']::public.app_role[]) then
    raise exception 'Tidak diizinkan' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'Periode tidak valid';
  end if;
  if p_to - p_from > 366 then
    raise exception 'Periode maksimal 1 tahun';
  end if;
  if p_group not in ('day', 'month') then
    raise exception 'Pengelompokan tidak dikenal';
  end if;

  v_start := (p_from::timestamp) at time zone 'Asia/Jakarta';
  v_end := ((p_to + 1)::timestamp) at time zone 'Asia/Jakarta';

  with paid as (
    select o.id, o.grand_total, o.subtotal, o.shipping_cost, o.discount_total,
           coalesce(o.paid_at, o.created_at) as at
      from public.orders o
     where o.status in ('paid', 'processing', 'shipped', 'delivered', 'completed')
       and coalesce(o.paid_at, o.created_at) >= v_start
       and coalesce(o.paid_at, o.created_at) < v_end
  ),
  items as (
    select oi.product_id, oi.product_name, oi.quantity, oi.line_total
      from public.order_items oi
      join paid p on p.id = oi.order_id
  )
  select jsonb_build_object(
    'totals', (
      select jsonb_build_object(
        'orders', count(*),
        'revenue', coalesce(sum(grand_total), 0),
        'subtotal', coalesce(sum(subtotal), 0),
        'shipping', coalesce(sum(shipping_cost), 0),
        'discount', coalesce(sum(discount_total), 0),
        'items', (select coalesce(sum(quantity), 0) from items)
      )
      from paid
    ),
    'series', coalesce((
      select jsonb_agg(jsonb_build_object('period', s.period, 'revenue', s.revenue, 'orders', s.orders) order by s.period)
        from (
          select to_char(date_trunc(p_group, at at time zone 'Asia/Jakarta'), case when p_group = 'day' then 'YYYY-MM-DD' else 'YYYY-MM' end) as period,
                 sum(grand_total) as revenue,
                 count(*) as orders
            from paid
           group by 1
        ) s
    ), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(x order by x.revenue desc)
        from (
          select i.product_id, max(i.product_name) as name, sum(i.quantity) as qty, sum(i.line_total) as revenue
            from items i
           group by i.product_id
           order by sum(i.line_total) desc
           limit 100
        ) x
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(x order by x.revenue desc)
        from (
          select coalesce(root.name, 'Tanpa kategori') as name, sum(i.quantity) as qty, sum(i.line_total) as revenue
            from items i
            left join lateral (
              select c.parent_id, c.name, c.id
                from public.product_categories pc
                join public.categories c on c.id = pc.category_id
               where pc.product_id = i.product_id
               order by c.parent_id nulls first
               limit 1
            ) cat on true
            left join public.categories root on root.id = coalesce(cat.parent_id, cat.id)
           group by 1
        ) x
    ), '[]'::jsonb),
    'payments', coalesce((
      select jsonb_agg(x order by x.revenue desc)
        from (
          select coalesce(pm.method, pm.provider::text, 'lainnya') as method, count(distinct p.id) as orders, sum(p.grand_total) as revenue
            from paid p
            left join lateral (
              select py.method, py.provider
                from public.payments py
               where py.order_id = p.id and py.status = 'paid'
               order by py.paid_at desc nulls last
               limit 1
            ) pm on true
           group by 1
        ) x
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- Daftar staf + email (owner/admin).
create or replace function public.admin_staff_list()
returns table (
  id uuid,
  full_name text,
  email text,
  role public.app_role,
  is_blocked boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_role(array['owner', 'admin']::public.app_role[]) then
    raise exception 'Tidak diizinkan' using errcode = '42501';
  end if;
  return query
  select p.id, p.full_name, u.email::text, p.role, p.is_blocked, p.created_at, u.last_sign_in_at
    from public.profiles p
    join auth.users u on u.id = p.id
   where p.role <> 'customer' and p.deleted_at is null
   order by array_position(array['owner', 'admin', 'warehouse', 'cs']::public.app_role[], p.role), p.created_at;
end;
$$;

-- Cari akun terdaftar berdasarkan email persis (owner saja, untuk dijadikan staf).
create or replace function public.admin_find_user(p_email text)
returns table (id uuid, full_name text, email text, role public.app_role)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_role(array['owner']::public.app_role[]) then
    raise exception 'Tidak diizinkan' using errcode = '42501';
  end if;
  if p_email is null or char_length(btrim(p_email)) < 5 then
    return;
  end if;
  return query
  select p.id, p.full_name, u.email::text, p.role
    from auth.users u
    join public.profiles p on p.id = u.id
   where lower(u.email) = lower(btrim(p_email)) and p.deleted_at is null
   limit 1;
end;
$$;

revoke all on function public.admin_sales_report(date, date, text) from public, anon;
revoke all on function public.admin_staff_list() from public, anon;
revoke all on function public.admin_find_user(text) from public, anon;
grant execute on function public.admin_sales_report(date, date, text) to authenticated;
grant execute on function public.admin_staff_list() to authenticated;
grant execute on function public.admin_find_user(text) to authenticated;
