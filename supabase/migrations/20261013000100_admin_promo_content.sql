-- Fase 8C: promo & konten.
-- 1) Bar promo (placement promo_bar) hanya teks + link: gambar tidak wajib.
-- 2) Halaman statis di DB (D-39): tentang, FAQ, cara belanja, kontak, legal (P-08).

alter table public.banners alter column image_public_id drop not null;
alter table public.banners
  add constraint banners_image_required check (placement = 'promo_bar' or image_public_id is not null);
alter table public.banners
  add constraint banners_text_len check (
    (title is null or char_length(title) <= 160) and (subtitle is null or char_length(subtitle) <= 300)
  );

create table public.content_pages (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  title             text not null,
  body              text not null default '',
  meta_description  text,
  is_published      boolean not null default false,
  updated_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint content_pages_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint content_pages_title_len check (char_length(title) between 2 and 120),
  constraint content_pages_body_len check (char_length(body) <= 50000),
  constraint content_pages_meta_len check (meta_description is null or char_length(meta_description) <= 170),
  constraint content_pages_publish_body check (not is_published or char_length(btrim(body)) > 0)
);

create trigger content_pages_set_updated_at before update on public.content_pages
  for each row execute function public.set_updated_at();
create trigger content_pages_audit after insert or update or delete on public.content_pages
  for each row execute function public.audit_row_change();

alter table public.content_pages enable row level security;

-- Publik hanya membaca yang tayang. Staf owner/admin membaca semua dan mengubah isi.
-- Daftar halaman tetap (seed di bawah): tidak ada policy insert/delete untuk aplikasi.
create policy content_pages_select on public.content_pages
  for select to anon, authenticated
  using (is_published or (select private.has_role(array['owner', 'admin']::public.app_role[])));
create policy content_pages_update on public.content_pages
  for update to authenticated
  using ((select private.has_role(array['owner', 'admin']::public.app_role[])))
  with check ((select private.has_role(array['owner', 'admin']::public.app_role[])));

grant select on public.content_pages to anon, authenticated;
grant update (title, body, meta_description, is_published, updated_by) on public.content_pages to authenticated;

-- Belum tayang = halaman publik memakai copy bawaan aplikasi (fallback).
insert into public.content_pages (slug, title) values
  ('about', 'Tentang NZO Industries'),
  ('faq', 'Pertanyaan yang sering diajukan'),
  ('how-to-buy', 'Cara belanja'),
  ('contact', 'Kontak'),
  ('privacy', 'Kebijakan Privasi'),
  ('terms', 'Syarat & Ketentuan'),
  ('returns-policy', 'Kebijakan Pengembalian')
on conflict (slug) do nothing;
