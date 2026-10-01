-- ============================================================
-- NZO Industries — 16 jejak audit vs penghapusan user
-- Masalah: kolom pelaku di tabel append-only memakai FK `on delete set null`.
-- Saat user dihapus (mis. permintaan hapus akun UU PDP), Postgres mencoba
-- UPDATE baris append-only dan ditolak trigger, sehingga user tidak bisa dihapus.
-- Solusi: simpan UUID pelaku tanpa FK. Jejak tetap utuh dan tidak bisa diubah.
-- ============================================================

alter table public.audit_logs drop constraint if exists audit_logs_actor_id_fkey;
alter table public.inventory_movements drop constraint if exists inventory_movements_created_by_fkey;
alter table public.order_status_history drop constraint if exists order_status_history_changed_by_fkey;

comment on column public.audit_logs.actor_id is 'auth.users.id pelaku; sengaja tanpa FK agar jejak tetap ada setelah user dihapus';
comment on column public.inventory_movements.created_by is 'auth.users.id pembuat; sengaja tanpa FK (ledger append-only)';
comment on column public.order_status_history.changed_by is 'auth.users.id pengubah; sengaja tanpa FK (riwayat append-only)';

-- order_status_history: UPDATE selalu ditolak; DELETE hanya lewat cascade dari
-- penghapusan order (pg_trigger_depth > 1 = dipicu aksi FK, bukan statement langsung).
create or replace function public.reject_mutation_unless_cascade()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception '% bersifat append-only', tg_table_name using errcode = '42501';
end;
$$;

revoke execute on function public.reject_mutation_unless_cascade() from public, anon, authenticated;

drop trigger if exists order_status_history_append_only on public.order_status_history;
create trigger order_status_history_append_only
  before update or delete on public.order_status_history
  for each row execute function public.reject_mutation_unless_cascade();
