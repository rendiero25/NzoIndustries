-- ============================================================
-- NZO Industries — 04 vehicles (merek → model → rentang tahun) & Garasi
-- ============================================================

create table public.vehicle_makes (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null,
  vehicle_type    public.vehicle_type not null,
  logo_public_id  text,
  sort_order      integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint vehicle_makes_slug_type_key unique (slug, vehicle_type),
  constraint vehicle_makes_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint vehicle_makes_logo_nzo check (logo_public_id is null or logo_public_id like 'nzo/%')
);

create table public.vehicle_models (
  id            uuid primary key default gen_random_uuid(),
  make_id       uuid not null references public.vehicle_makes (id) on delete restrict,
  name          text not null,
  slug          text not null,
  vehicle_type  public.vehicle_type not null,
  year_start    smallint not null,
  year_end      smallint,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint vehicle_models_make_slug_key unique (make_id, slug),
  constraint vehicle_models_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint vehicle_models_year_range check (
    year_start between 1950 and 2100 and (year_end is null or year_end between year_start and 2100)
  )
);

create index vehicle_models_make_idx on public.vehicle_models (make_id);

create table public.user_vehicles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  model_id    uuid not null references public.vehicle_models (id) on delete restrict,
  year        smallint not null,
  nickname    text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint user_vehicles_year_range check (year between 1950 and 2100),
  constraint user_vehicles_nickname_len check (nickname is null or char_length(nickname) <= 60)
);

create index user_vehicles_user_idx on public.user_vehicles (user_id);
create index user_vehicles_model_idx on public.user_vehicles (model_id);
create unique index user_vehicles_one_default on public.user_vehicles (user_id) where is_default;

create trigger vehicle_makes_set_updated_at before update on public.vehicle_makes
  for each row execute function public.set_updated_at();
create trigger vehicle_models_set_updated_at before update on public.vehicle_models
  for each row execute function public.set_updated_at();
create trigger user_vehicles_set_updated_at before update on public.user_vehicles
  for each row execute function public.set_updated_at();

-- RLS
alter table public.vehicle_makes enable row level security;
alter table public.vehicle_models enable row level security;
alter table public.user_vehicles enable row level security;

create policy vehicle_makes_select on public.vehicle_makes
  for select to anon, authenticated
  using (is_active or (select public.is_staff()));
create policy vehicle_makes_write on public.vehicle_makes
  for all to authenticated
  using ((select public.has_role(array['owner', 'admin']::public.app_role[])))
  with check ((select public.has_role(array['owner', 'admin']::public.app_role[])));

create policy vehicle_models_select on public.vehicle_models
  for select to anon, authenticated
  using (is_active or (select public.is_staff()));
create policy vehicle_models_write on public.vehicle_models
  for all to authenticated
  using ((select public.has_role(array['owner', 'admin']::public.app_role[])))
  with check ((select public.has_role(array['owner', 'admin']::public.app_role[])));

create policy user_vehicles_own_all on public.user_vehicles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
