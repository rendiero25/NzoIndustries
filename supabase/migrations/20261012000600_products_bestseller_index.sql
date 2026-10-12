-- Beranda tab "Terlaris" tanpa filter: urut total_sold lewat index (bukan sort seluruh katalog).
create index if not exists products_bestseller_idx
  on public.products (total_sold desc, published_at desc)
  where status = 'published';
