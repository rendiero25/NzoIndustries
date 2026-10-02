-- ============================================================
-- NZO Industries — 17 MFA staf jadi opsional lewat flag (D-20)
-- Keputusan user: login admin tanpa scan QR / TOTP. MFA tidak dihapus,
-- tetapi dikendalikan `store_settings.require_staff_mfa` (default false).
-- Owner bisa menyalakannya lagi; RLS dan guard aplikasi langsung mengikuti.
-- ============================================================

alter table public.store_settings
  add column if not exists require_staff_mfa boolean not null default false;

comment on column public.store_settings.require_staff_mfa is
  'true = role staf wajib sesi MFA aal2 (TOTP) di RLS dan aplikasi. D-20.';

-- Dibaca dari policy (lewat has_role) dan dari aplikasi (lewat RPC publik).
create or replace function private.staff_mfa_required()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select s.require_staff_mfa from public.store_settings s where s.id), false);
$$;

create or replace function private.has_role(roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select cur.r = any (roles)
        and (
          cur.r = 'customer'::public.app_role
          or not private.staff_mfa_required()
          or private.is_mfa_verified()
        )
      from (select private.current_app_role() as r) as cur
    ),
    false
  );
$$;

-- RPC untuk aplikasi (guard, proxy, halaman login staf). Hanya boolean kebijakan.
create or replace function public.staff_mfa_required()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.staff_mfa_required();
$$;

revoke all on function private.staff_mfa_required() from public;
grant execute on function private.staff_mfa_required() to anon, authenticated;
revoke all on function public.staff_mfa_required() from public;
grant execute on function public.staff_mfa_required() to anon, authenticated;
