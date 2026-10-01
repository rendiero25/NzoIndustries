-- ============================================================
-- NZO Industries — 10 returns, warranty claims, reviews
-- Path media mengacu ke bucket privat after-sales-media / publik review-images.
-- ============================================================

create table public.returns (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  order_item_id  uuid references public.order_items (id) on delete set null,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  reason         text not null,
  description    text,
  media_paths    text[] not null default '{}',
  status         public.return_status not null default 'requested',
  return_awb     text,
  admin_note     text,
  resolution     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint returns_reason_len check (char_length(reason) between 3 and 200),
  constraint returns_media_count check (cardinality(media_paths) <= 6)
);

create index returns_order_idx on public.returns (order_id);
create index returns_user_idx on public.returns (user_id, created_at desc);
create index returns_status_idx on public.returns (status, created_at desc);

create table public.warranty_claims (
  id             uuid primary key default gen_random_uuid(),
  order_item_id  uuid not null references public.order_items (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  description    text not null,
  media_paths    text[] not null default '{}',
  status         public.claim_status not null default 'submitted',
  admin_note     text,
  resolution     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint warranty_claims_description_len check (char_length(description) between 10 and 2000),
  constraint warranty_claims_media_count check (cardinality(media_paths) <= 6)
);

create index warranty_claims_user_idx on public.warranty_claims (user_id, created_at desc);
create index warranty_claims_status_idx on public.warranty_claims (status, created_at desc);

create table public.reviews (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  order_item_id  uuid not null unique references public.order_items (id) on delete cascade,
  rating         smallint not null,
  comment        text,
  image_paths    text[] not null default '{}',
  status         public.review_status not null default 'pending',
  reply          text,
  replied_by     uuid references public.profiles (id) on delete set null,
  replied_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint reviews_rating_range check (rating between 1 and 5),
  constraint reviews_comment_len check (comment is null or char_length(comment) <= 2000),
  constraint reviews_images_count check (cardinality(image_paths) <= 5)
);

create index reviews_product_published_idx on public.reviews (product_id, created_at desc) where status = 'published';
create index reviews_status_idx on public.reviews (status, created_at desc);
create index reviews_user_idx on public.reviews (user_id);

create trigger returns_set_updated_at before update on public.returns
  for each row execute function public.set_updated_at();
create trigger warranty_claims_set_updated_at before update on public.warranty_claims
  for each row execute function public.set_updated_at();
create trigger reviews_set_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

-- Rollup rating produk dari ulasan published saja.
create or replace function public.refresh_product_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.product_id, old.product_id);
begin
  perform set_config('nzo.cache_write', 'on', true);
  update public.products p set
    average_rating = coalesce((
      select round(avg(r.rating)::numeric, 2) from public.reviews r
      where r.product_id = target and r.status = 'published'
    ), 0),
    review_count = (
      select count(*) from public.reviews r
      where r.product_id = target and r.status = 'published'
    )
  where p.id = target;
  perform set_config('nzo.cache_write', 'off', true);
  return null;
end;
$$;

create trigger reviews_refresh_rating
  after insert or update of status, rating or delete on public.reviews
  for each row execute function public.refresh_product_rating();

-- order_item milik user dan pesanan sudah selesai (syarat ulasan/garansi).
create or replace function public.owns_completed_order_item(p_order_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = p_order_item_id
      and o.user_id = (select auth.uid())
      and o.status in ('delivered', 'completed')
  );
$$;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.returns enable row level security;
alter table public.warranty_claims enable row level security;
alter table public.reviews enable row level security;

create policy returns_select_own on public.returns
  for select to authenticated using (user_id = (select auth.uid()));
create policy returns_insert_own on public.returns
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.owns_order(order_id)
    and status = 'requested'
    and admin_note is null
    and resolution is null
  );
create policy returns_select_staff on public.returns
  for select to authenticated using ((select public.is_staff()));
create policy returns_update_staff on public.returns
  for update to authenticated
  using ((select public.has_role(array['owner', 'admin', 'cs']::public.app_role[])))
  with check ((select public.has_role(array['owner', 'admin', 'cs']::public.app_role[])));

create policy warranty_claims_select_own on public.warranty_claims
  for select to authenticated using (user_id = (select auth.uid()));
create policy warranty_claims_insert_own on public.warranty_claims
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.owns_completed_order_item(order_item_id)
    and status = 'submitted'
    and admin_note is null
    and resolution is null
  );
create policy warranty_claims_select_staff on public.warranty_claims
  for select to authenticated using ((select public.is_staff()));
create policy warranty_claims_update_staff on public.warranty_claims
  for update to authenticated
  using ((select public.has_role(array['owner', 'admin', 'cs']::public.app_role[])))
  with check ((select public.has_role(array['owner', 'admin', 'cs']::public.app_role[])));

create policy reviews_select_public on public.reviews
  for select to anon, authenticated using (status = 'published');
create policy reviews_select_own on public.reviews
  for select to authenticated using (user_id = (select auth.uid()));
create policy reviews_select_staff on public.reviews
  for select to authenticated using ((select public.is_staff()));
create policy reviews_insert_own on public.reviews
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.owns_completed_order_item(order_item_id)
    and exists (
      select 1 from public.order_items oi
      where oi.id = order_item_id and oi.product_id = reviews.product_id
    )
    and status = 'pending'
    and reply is null
  );
create policy reviews_moderate_staff on public.reviews
  for update to authenticated
  using ((select public.has_role(array['owner', 'admin', 'cs']::public.app_role[])))
  with check ((select public.has_role(array['owner', 'admin', 'cs']::public.app_role[])));
