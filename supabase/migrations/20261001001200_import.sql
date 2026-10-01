-- ============================================================
-- NZO Industries — 12 import staging (Jubelio / CSV)
-- Alur: batch → import_products (staging) → commit sebagai produk draft.
-- ============================================================

create table public.import_batches (
  id              uuid primary key default gen_random_uuid(),
  source          public.import_source not null,
  status          public.import_status not null default 'pending',
  file_name       text,
  is_dry_run      boolean not null default false,
  total_rows      integer not null default 0,
  success_rows    integer not null default 0,
  failed_rows     integer not null default 0,
  skipped_rows    integer not null default 0,
  created_by      uuid references public.profiles (id) on delete set null default auth.uid(),
  started_at      timestamptz,
  finished_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index import_batches_created_idx on public.import_batches (created_at desc);

create table public.import_products (
  id               uuid primary key default gen_random_uuid(),
  batch_id         uuid not null references public.import_batches (id) on delete cascade,
  sku              text,
  jubelio_item_id  text,
  raw              jsonb not null,
  mapped           jsonb,
  status           public.import_row_status not null default 'pending',
  error            text,
  product_id       uuid references public.products (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index import_products_batch_idx on public.import_products (batch_id, status);
create index import_products_sku_idx on public.import_products (sku);

create table public.import_logs (
  id          bigint generated always as identity primary key,
  batch_id    uuid not null references public.import_batches (id) on delete cascade,
  level       text not null default 'info',
  sku         text,
  message     text not null,
  created_at  timestamptz not null default now(),
  constraint import_logs_level check (level in ('info', 'warn', 'error'))
);

create index import_logs_batch_idx on public.import_logs (batch_id, created_at);

create trigger import_products_set_updated_at before update on public.import_products
  for each row execute function public.set_updated_at();

alter table public.import_batches enable row level security;
alter table public.import_products enable row level security;
alter table public.import_logs enable row level security;

create policy import_batches_admins on public.import_batches
  for all to authenticated
  using ((select public.has_role(array['owner', 'admin']::public.app_role[])))
  with check ((select public.has_role(array['owner', 'admin']::public.app_role[])));

create policy import_products_admins on public.import_products
  for all to authenticated
  using ((select public.has_role(array['owner', 'admin']::public.app_role[])))
  with check ((select public.has_role(array['owner', 'admin']::public.app_role[])));

create policy import_logs_admins on public.import_logs
  for select to authenticated
  using ((select public.has_role(array['owner', 'admin']::public.app_role[])));
