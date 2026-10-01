-- ============================================================
-- NZO Industries — 03 profiles, role helpers, addresses
-- ============================================================

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  avatar_url  text,
  role        public.app_role not null default 'customer',
  is_blocked  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint profiles_full_name_len check (full_name is null or char_length(full_name) <= 120),
  constraint profiles_phone_format check (phone is null or phone ~ '^\+?[0-9]{8,15}$')
);

create index profiles_role_idx on public.profiles (role) where role <> 'customer';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Role helpers (SECURITY DEFINER, search_path kosong)
-- Policy memanggil `(select public.has_role(...))` agar dievaluasi sekali.
-- ------------------------------------------------------------
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.is_blocked = false
    and p.deleted_at is null;
$$;

-- true bila role user ada di daftar. Role staf (selain customer) wajib aal2.
create or replace function public.has_role(roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select cur.r = any (roles)
        and (cur.r = 'customer'::public.app_role or public.is_mfa_verified())
      from (select public.current_app_role() as r) as cur
    ),
    false
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role(array['owner', 'admin', 'warehouse', 'cs']::public.app_role[]);
$$;

revoke execute on function public.current_app_role() from public, anon;
grant execute on function public.current_app_role() to authenticated;

-- ------------------------------------------------------------
-- profiles RLS
-- Kolom yang boleh diubah user sendiri dibatasi lewat column privilege.
-- role / is_blocked hanya lewat RPC set_user_role / set_user_blocked.
-- ------------------------------------------------------------
alter table public.profiles enable row level security;

revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_select_staff on public.profiles
  for select to authenticated
  using ((select public.has_role(array['owner', 'admin', 'cs']::public.app_role[])));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and deleted_at is null)
  with check (id = (select auth.uid()));

-- ------------------------------------------------------------
-- handle_new_user: profil otomatis, role selalu customer.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta_phone text := new.raw_user_meta_data ->> 'phone';
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    left(nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')), ''), 120),
    case when meta_phone ~ '^\+?[0-9]{8,15}$' then meta_phone end,
    'customer'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- RPC: ubah role (owner + MFA saja; owner terakhir tidak bisa diturunkan).
-- Audit log ditulis oleh trigger audit pada profiles (migration 13).
-- ------------------------------------------------------------
create or replace function public.set_user_role(target_user uuid, new_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_role public.app_role;
begin
  if not public.has_role(array['owner']::public.app_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select role into old_role from public.profiles where id = target_user for update;
  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  if old_role = 'owner' and new_role <> 'owner'
     and (select count(*) from public.profiles where role = 'owner' and deleted_at is null) <= 1 then
    raise exception 'cannot demote the last owner' using errcode = '42501';
  end if;

  update public.profiles set role = new_role where id = target_user;
end;
$$;

create or replace function public.set_user_blocked(target_user uuid, blocked boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.app_role;
begin
  if not public.has_role(array['owner', 'admin']::public.app_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select role into target_role from public.profiles where id = target_user for update;
  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  -- Admin hanya bisa memblokir customer; staf diatur owner.
  if target_role <> 'customer' and not public.has_role(array['owner']::public.app_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if target_user = (select auth.uid()) then
    raise exception 'cannot block yourself' using errcode = '42501';
  end if;

  update public.profiles set is_blocked = blocked where id = target_user;
end;
$$;

revoke execute on function public.set_user_role(uuid, public.app_role) from public, anon;
revoke execute on function public.set_user_blocked(uuid, boolean) from public, anon;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.set_user_blocked(uuid, boolean) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ------------------------------------------------------------
-- addresses (kolom kompatibel starter untuk Biteship)
-- ------------------------------------------------------------
create table public.addresses (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  label             text,
  recipient         text not null,
  phone             text not null,
  province          text not null,
  city              text not null,
  district          text not null,
  postal_code       text not null,
  full_address      text not null,
  latitude          double precision,
  longitude         double precision,
  biteship_area_id  text,
  is_default        boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint addresses_postal_code_format check (postal_code ~ '^[0-9]{5}$'),
  constraint addresses_phone_format check (phone ~ '^\+?[0-9]{8,15}$'),
  constraint addresses_lat_range check (latitude is null or latitude between -90 and 90),
  constraint addresses_lng_range check (longitude is null or longitude between -180 and 180)
);

create index addresses_user_idx on public.addresses (user_id);
create unique index addresses_one_default_per_user on public.addresses (user_id) where is_default;

create trigger addresses_set_updated_at
  before update on public.addresses
  for each row execute function public.set_updated_at();

alter table public.addresses enable row level security;

create policy addresses_own_all on public.addresses
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy addresses_select_staff on public.addresses
  for select to authenticated
  using ((select public.has_role(array['owner', 'admin', 'cs']::public.app_role[])));
