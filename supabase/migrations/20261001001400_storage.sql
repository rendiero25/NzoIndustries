-- ============================================================
-- NZO Industries — 14 storage buckets (security rule 10)
-- Foto produk/banner di Cloudinary (D-13, D-16). Supabase Storage hanya untuk
-- file milik pelanggan. Path wajib diawali `{auth.uid()}/`.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('payment-proofs', 'payment-proofs', false, 5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('after-sales-media', 'after-sales-media', false, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'video/mp4']),
  ('review-images', 'review-images', true, 2097152,
    array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- payment-proofs & after-sales-media: privat. Upload/baca milik sendiri; staf baca.
create policy "private_media_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('payment-proofs', 'after-sales-media')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "private_media_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('payment-proofs', 'after-sales-media')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "payment_proofs_select_staff" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (select public.has_role(array['owner', 'admin', 'cs']::public.app_role[]))
  );

create policy "after_sales_media_select_staff" on storage.objects
  for select to authenticated
  using (bucket_id = 'after-sales-media' and (select public.is_staff()));

-- review-images: publik dibaca lewat URL publik bucket; upload ke folder sendiri.
create policy "review_images_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'review-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "review_images_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'review-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "review_images_delete_staff" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'review-images'
    and (select public.has_role(array['owner', 'admin', 'cs']::public.app_role[]))
  );
