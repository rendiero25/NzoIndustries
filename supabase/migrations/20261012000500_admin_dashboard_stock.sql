-- Fase 8A: stok menipis (1..ambang) dipisah dari stok habis.
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
      where status = 'published' and stock > 0 and stock <= threshold),
    'out_of_stock_count', (select count(*) from public.products
      where status = 'published' and stock <= 0),
    'low_stock', (select coalesce(jsonb_agg(l), '[]'::jsonb) from (
      select id, name, sku, stock from public.products
      where status = 'published' and stock <= threshold and stock > 0
      order by stock asc, name limit 8) l),
    'threshold', threshold
  ) into result;
  return result;
end;
$$;
