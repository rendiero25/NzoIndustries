-- ============================================================
-- NZO Industries — 11 notifications, audit logs, webhook events, store settings
-- ============================================================

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  constraint notifications_link_relative check (link is null or link like '/%')
);

create index notifications_user_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;
create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Dibuat server (service role). User hanya baca & tandai dibaca.
revoke insert, update, delete on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_mark_read_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ------------------------------------------------------------
-- audit_logs: hanya ditulis trigger (SECURITY DEFINER), tidak bisa diubah.
-- ------------------------------------------------------------
create table public.audit_logs (
  id           bigint generated always as identity primary key,
  actor_id     uuid references public.profiles (id) on delete set null,
  actor_role   public.app_role,
  action       text not null,
  entity_type  text not null,
  entity_id    text,
  before_data  jsonb,
  after_data   jsonb,
  created_at   timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);

create trigger audit_logs_append_only
  before update or delete on public.audit_logs
  for each row execute function public.reject_mutation();

alter table public.audit_logs enable row level security;
revoke insert, update, delete on public.audit_logs from anon, authenticated;

create policy audit_logs_select_admins on public.audit_logs
  for select to authenticated
  using ((select public.has_role(array['owner', 'admin']::public.app_role[])));

-- ------------------------------------------------------------
-- webhook_events: idempotensi webhook Mayar/Biteship. Service role saja.
-- ------------------------------------------------------------
create table public.webhook_events (
  id            bigint generated always as identity primary key,
  provider      text not null,
  event_id      text not null,
  event_type    text,
  payload_hash  text,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz,
  error         text,
  constraint webhook_events_provider check (provider in ('mayar', 'biteship')),
  constraint webhook_events_unique unique (provider, event_id)
);

alter table public.webhook_events enable row level security;
revoke all on public.webhook_events from anon, authenticated;
-- Tanpa policy: hanya service role (bypass RLS) yang bisa mengakses.

-- ------------------------------------------------------------
-- store_settings: satu baris. Owner menulis, admin membaca.
-- Data publik (nama toko, toggle pembayaran) disajikan server.
-- ------------------------------------------------------------
create table public.store_settings (
  id                        boolean primary key default true,
  store_name                text not null default 'NZO Industries',
  support_email             text,
  support_whatsapp          text,
  mayar_enabled             boolean not null default false,
  manual_transfer_enabled   boolean not null default false,
  bank_accounts             jsonb not null default '[]'::jsonb,
  payment_timeout_minutes   integer not null default 1440,
  shipper                   jsonb not null default '{}'::jsonb,
  low_stock_threshold       integer not null default 5,
  updated_at                timestamptz not null default now(),
  constraint store_settings_singleton check (id),
  constraint store_settings_timeout check (payment_timeout_minutes between 15 and 10080),
  constraint store_settings_low_stock check (low_stock_threshold >= 0),
  constraint store_settings_bank_accounts_array check (jsonb_typeof(bank_accounts) = 'array'),
  constraint store_settings_shipper_object check (jsonb_typeof(shipper) = 'object')
);

create trigger store_settings_set_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();

alter table public.store_settings enable row level security;
revoke insert, delete on public.store_settings from anon, authenticated;

create policy store_settings_select_admins on public.store_settings
  for select to authenticated
  using ((select public.has_role(array['owner', 'admin']::public.app_role[])));
create policy store_settings_update_owner on public.store_settings
  for update to authenticated
  using ((select public.has_role(array['owner']::public.app_role[])))
  with check ((select public.has_role(array['owner']::public.app_role[])));

insert into public.store_settings (id) values (true) on conflict do nothing;
