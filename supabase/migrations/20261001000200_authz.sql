-- ============================================================
-- NZO Industries — 02 shared triggers & MFA helper
-- ============================================================
-- Helper role (current_app_role, has_role, is_staff) didefinisikan di
-- migration users, setelah tabel profiles ada.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Sesi sudah lolos MFA (TOTP) — Authenticator Assurance Level 2.
create or replace function public.is_mfa_verified()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2';
$$;
