-- Jendela retur (D-36) untuk UI pelanggan; store_settings hanya terbaca admin.
create or replace function public.store_return_window_days()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select return_window_days from public.store_settings where id
$$;

revoke all on function public.store_return_window_days() from public, anon;
grant execute on function public.store_return_window_days() to authenticated;
