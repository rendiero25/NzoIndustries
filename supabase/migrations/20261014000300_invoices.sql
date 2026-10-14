-- Fase 9: nomor invoice berurutan & tidak bisa diubah (D-41), mode pajak (D-42).
-- Nomor diterbitkan trigger saat status pesanan berubah menjadi `paid`
-- (mark_order_paid maupun aktivasi ulang admin), jadi tidak perlu menyalin
-- ulang body fungsi pelunasan.

create table public.invoice_counters (
  year     integer primary key,
  last_no  integer not null default 0 check (last_no >= 0)
);
alter table public.invoice_counters enable row level security;
-- Tanpa policy: hanya fungsi security definer yang menyentuh tabel ini.
revoke all on public.invoice_counters from anon, authenticated;

alter table public.orders
  add column invoice_number text unique,
  add column invoice_issued_at timestamptz,
  add constraint orders_invoice_number_format check (
    invoice_number is null or invoice_number ~ '^INV/[0-9]{4}/[0-9]{6,}$'
  );

-- Nomor berikutnya untuk tahun (WIB) tertentu. Lock baris counter = tanpa celah & tanpa duplikat.
create or replace function private.next_invoice_number(p_at timestamptz)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_year integer := extract(year from (p_at at time zone 'Asia/Jakarta'))::integer;
  v_no integer;
begin
  insert into public.invoice_counters (year, last_no) values (v_year, 1)
  on conflict (year) do update set last_no = public.invoice_counters.last_no + 1
  returning last_no into v_no;
  return 'INV/' || v_year || '/' || lpad(v_no::text, 6, '0');
end;
$$;

create or replace function private.orders_invoice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Nomor yang sudah terbit tidak boleh diubah atau dihapus (oleh siapa pun).
  if old.invoice_number is not null and new.invoice_number is distinct from old.invoice_number then
    raise exception 'Nomor invoice tidak bisa diubah.' using errcode = 'P0001';
  end if;
  if old.invoice_issued_at is not null and new.invoice_issued_at is distinct from old.invoice_issued_at then
    raise exception 'Tanggal invoice tidak bisa diubah.' using errcode = 'P0001';
  end if;

  -- Terbitkan saat pertama kali lunas.
  if new.invoice_number is null and new.status = 'paid' and old.status is distinct from 'paid' then
    new.invoice_issued_at := coalesce(new.paid_at, now());
    new.invoice_number := private.next_invoice_number(new.invoice_issued_at);
  end if;
  return new;
end;
$$;

create trigger orders_invoice
  before update on public.orders
  for each row execute function private.orders_invoice();

-- Backfill pesanan yang sudah lunas, urut waktu bayar.
do $$
declare
  r record;
  v_at timestamptz;
begin
  for r in
    select id, coalesce(paid_at, created_at) as at
      from public.orders
     where invoice_number is null
       and status in ('paid', 'processing', 'shipped', 'delivered', 'completed', 'refunded')
     order by coalesce(paid_at, created_at), created_at
  loop
    v_at := r.at;
    perform set_config('nzo.skip_audit', 'on', true);
    update public.orders
       set invoice_number = private.next_invoice_number(v_at),
           invoice_issued_at = v_at
     where id = r.id;
  end loop;
  perform set_config('nzo.skip_audit', '', true);
end;
$$;

revoke all on function private.next_invoice_number(timestamptz) from public, anon, authenticated;
revoke all on function private.orders_invoice() from public, anon, authenticated;

-- Mode pajak (D-42). `none` sampai P-07 terjawab.
alter table public.store_settings
  add column tax_mode text not null default 'none',
  add constraint store_settings_tax_mode check (tax_mode in ('none', 'ppn_included'));
