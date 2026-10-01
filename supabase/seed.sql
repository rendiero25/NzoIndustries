-- ============================================================
-- NZO Industries — seed data contoh (development)
-- Idempotent: aman dijalankan ulang (on conflict do nothing).
-- Produk dummy memakai SKU berawalan DEMO- dan gambar belum diisi
-- (foto diunggah ke Cloudinary nzo/products/{sku} di Fase 3).
-- ============================================================

select set_config('nzo.skip_audit', 'on', false);

insert into public.store_settings (id) values (true) on conflict do nothing;

-- ------------------------------------------------------------
-- Kategori (D-07: non-otomotif dipisah lewat kategori)
-- ------------------------------------------------------------
insert into public.categories (name, slug, is_automotive, sort_order) values
  ('Motor', 'motor', true, 1),
  ('Mobil', 'mobil', true, 2),
  ('Non-Otomotif', 'non-otomotif', false, 3)
on conflict (slug) do nothing;

insert into public.categories (parent_id, name, slug, is_automotive, sort_order)
select p.id, c.name, c.slug, c.is_automotive, c.sort_order
from (values
  ('motor', 'Oli & Pelumas Motor', 'oli-motor', true, 1),
  ('motor', 'Rem Motor', 'rem-motor', true, 2),
  ('motor', 'Lampu Motor', 'lampu-motor', true, 3),
  ('motor', 'Aksesoris Motor', 'aksesoris-motor', true, 4),
  ('mobil', 'Oli & Pelumas Mobil', 'oli-mobil', true, 1),
  ('mobil', 'Wiper', 'wiper', true, 2),
  ('mobil', 'Lampu Mobil', 'lampu-mobil', true, 3),
  ('mobil', 'Aksesoris Interior', 'aksesoris-interior', true, 4),
  ('non-otomotif', 'Perawatan & Kebersihan', 'perawatan-kebersihan', false, 1),
  ('non-otomotif', 'Peralatan', 'peralatan', false, 2)
) as c(parent_slug, name, slug, is_automotive, sort_order)
join public.categories p on p.slug = c.parent_slug
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- Brand dummy
-- ------------------------------------------------------------
insert into public.brands (name, slug, sort_order) values
  ('Demo Lube', 'demo-lube', 1),
  ('Demo Brake', 'demo-brake', 2),
  ('Demo Light', 'demo-light', 3),
  ('Demo Wiper', 'demo-wiper', 4),
  ('Demo Care', 'demo-care', 5),
  ('Demo Tools', 'demo-tools', 6)
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- Kendaraan: merek & model populer
-- ------------------------------------------------------------
insert into public.vehicle_makes (name, slug, vehicle_type, sort_order) values
  ('Honda', 'honda', 'motorcycle', 1),
  ('Yamaha', 'yamaha', 'motorcycle', 2),
  ('Suzuki', 'suzuki', 'motorcycle', 3),
  ('Kawasaki', 'kawasaki', 'motorcycle', 4),
  ('Toyota', 'toyota', 'car', 1),
  ('Honda', 'honda', 'car', 2),
  ('Daihatsu', 'daihatsu', 'car', 3),
  ('Suzuki', 'suzuki', 'car', 4),
  ('Mitsubishi', 'mitsubishi', 'car', 5)
on conflict (slug, vehicle_type) do nothing;

insert into public.vehicle_models (make_id, name, slug, vehicle_type, year_start, year_end)
select mk.id, m.name, m.slug, m.vtype::public.vehicle_type, m.y1, m.y2
from (values
  ('honda', 'motorcycle', 'BeAT', 'beat', 2008, null),
  ('honda', 'motorcycle', 'Vario 125', 'vario-125', 2012, null),
  ('honda', 'motorcycle', 'Vario 160', 'vario-160', 2022, null),
  ('honda', 'motorcycle', 'PCX 160', 'pcx-160', 2021, null),
  ('honda', 'motorcycle', 'Supra X 125', 'supra-x-125', 2005, null),
  ('yamaha', 'motorcycle', 'NMAX', 'nmax', 2015, null),
  ('yamaha', 'motorcycle', 'Aerox 155', 'aerox-155', 2016, null),
  ('yamaha', 'motorcycle', 'Mio M3', 'mio-m3', 2014, null),
  ('yamaha', 'motorcycle', 'R15', 'r15', 2014, null),
  ('suzuki', 'motorcycle', 'Satria F150', 'satria-f150', 2004, null),
  ('suzuki', 'motorcycle', 'Nex II', 'nex-ii', 2018, null),
  ('kawasaki', 'motorcycle', 'Ninja 250', 'ninja-250', 2008, null),
  ('kawasaki', 'motorcycle', 'KLX 150', 'klx-150', 2009, null),
  ('toyota', 'car', 'Avanza', 'avanza', 2003, null),
  ('toyota', 'car', 'Innova', 'innova', 2004, 2015),
  ('toyota', 'car', 'Kijang Innova Reborn', 'innova-reborn', 2016, null),
  ('toyota', 'car', 'Calya', 'calya', 2016, null),
  ('honda', 'car', 'Brio', 'brio', 2012, null),
  ('honda', 'car', 'HR-V', 'hr-v', 2014, null),
  ('daihatsu', 'car', 'Xenia', 'xenia', 2004, null),
  ('daihatsu', 'car', 'Ayla', 'ayla', 2013, null),
  ('daihatsu', 'car', 'Terios', 'terios', 2006, null),
  ('suzuki', 'car', 'Ertiga', 'ertiga', 2012, null),
  ('suzuki', 'car', 'Carry Pick Up', 'carry-pick-up', 2019, null),
  ('mitsubishi', 'car', 'Xpander', 'xpander', 2017, null),
  ('mitsubishi', 'car', 'Pajero Sport', 'pajero-sport', 2008, null)
) as m(make_slug, vtype, name, slug, y1, y2)
join public.vehicle_makes mk on mk.slug = m.make_slug and mk.vehicle_type = m.vtype::public.vehicle_type
on conflict (make_id, slug) do nothing;

-- ------------------------------------------------------------
-- Produk dummy (published & draft)
-- ------------------------------------------------------------
insert into public.products (
  name, slug, sku, price, compare_at_price, status, brand_id, short_description, description,
  weight_grams, length_mm, width_mm, height_mm
)
select p.name, p.slug, p.sku, p.price, p.compare_at, p.status::public.product_status, b.id,
  p.short_desc, p.short_desc || '. Produk contoh untuk pengembangan.', p.weight, p.l, p.w, p.h
from (values
  ('Oli Mesin Matic 10W-30 0.8L', 'demo-oli-matic-10w30', 'DEMO-OLI-001', 55000, 62000, 'published', 'demo-lube', 'Oli mesin skutik matic', 900, 80, 60, 200),
  ('Oli Gardan Matic 120ml', 'demo-oli-gardan', 'DEMO-OLI-002', 18000, null, 'published', 'demo-lube', 'Oli gardan untuk motor matic', 150, 40, 40, 120),
  ('Kampas Rem Depan Matic', 'demo-kampas-rem-matic', 'DEMO-REM-001', 45000, null, 'published', 'demo-brake', 'Kampas rem cakram depan', 200, 100, 60, 30),
  ('Kampas Rem Belakang Bebek', 'demo-kampas-rem-bebek', 'DEMO-REM-002', 38000, 42000, 'published', 'demo-brake', 'Kampas rem tromol belakang', 250, 120, 80, 40),
  ('Lampu LED Motor H4', 'demo-led-motor-h4', 'DEMO-LMP-001', 85000, null, 'published', 'demo-light', 'Lampu utama LED H4', 180, 100, 80, 60),
  ('Spion Motor Universal', 'demo-spion-universal', 'DEMO-AKS-001', 65000, null, 'published', 'demo-tools', 'Spion bulat universal', 400, 200, 120, 80),
  ('Oli Mesin Mobil 5W-30 4L', 'demo-oli-mobil-5w30', 'DEMO-OLI-101', 420000, 465000, 'published', 'demo-lube', 'Oli full synthetic 4 liter', 3800, 250, 120, 300),
  ('Wiper Blade Frameless', 'demo-wiper-frameless', 'DEMO-WPR-101', 75000, null, 'published', 'demo-wiper', 'Wiper frameless, pilih ukuran', 300, 650, 60, 40),
  ('Lampu LED Mobil H11', 'demo-led-mobil-h11', 'DEMO-LMP-101', 250000, 299000, 'published', 'demo-light', 'Lampu kabut LED H11 sepasang', 400, 150, 100, 80),
  ('Karpet Dasar Mobil 3 Baris', 'demo-karpet-mobil', 'DEMO-INT-101', 350000, null, 'published', 'demo-tools', 'Karpet karet 3 baris', 5000, 600, 400, 150),
  ('Sampo Mobil & Motor 1L', 'demo-sampo-kendaraan', 'DEMO-CARE-001', 35000, null, 'published', 'demo-care', 'Sampo wax untuk cuci kendaraan', 1100, 90, 90, 250),
  ('Lap Microfiber Set', 'demo-lap-microfiber', 'DEMO-CARE-002', 29000, 35000, 'published', 'demo-care', 'Lap microfiber isi 3', 200, 300, 200, 30),
  ('Kunci Sok Set 24 pcs', 'demo-kunci-sok-set', 'DEMO-TOOL-001', 189000, null, 'published', 'demo-tools', 'Set kunci sok 24 pcs', 2200, 350, 200, 70),
  ('Busi Iridium Motor', 'demo-busi-iridium', 'DEMO-AKS-002', 95000, null, 'draft', 'demo-tools', 'Busi iridium (draft, belum tampil)', 50, 80, 30, 30),
  ('Cover Jok Mobil', 'demo-cover-jok', 'DEMO-INT-102', 450000, null, 'archived', 'demo-tools', 'Cover jok (archived)', 3000, 500, 400, 200)
) as p(name, slug, sku, price, compare_at, status, brand_slug, short_desc, weight, l, w, h)
join public.brands b on b.slug = p.brand_slug
on conflict (sku) do nothing;

-- Varian (D-18: sebagian varian punya harga sendiri)
insert into public.product_variants (product_id, sku, name, options, price, sort_order)
select pr.id, v.sku, v.name, v.options::jsonb, v.price, v.sort_order
from (values
  ('DEMO-WPR-101', 'DEMO-WPR-101-14', '14 inci', '{"ukuran":"14"}', 65000, 1),
  ('DEMO-WPR-101', 'DEMO-WPR-101-18', '18 inci', '{"ukuran":"18"}', null, 2),
  ('DEMO-WPR-101', 'DEMO-WPR-101-22', '22 inci', '{"ukuran":"22"}', 85000, 3),
  ('DEMO-AKS-001', 'DEMO-AKS-001-BLK', 'Hitam', '{"warna":"Hitam"}', null, 1),
  ('DEMO-AKS-001', 'DEMO-AKS-001-CRM', 'Chrome', '{"warna":"Chrome"}', 75000, 2)
) as v(product_sku, sku, name, options, price, sort_order)
join public.products pr on pr.sku = v.product_sku
on conflict (sku) do nothing;

-- Relasi kategori
insert into public.product_categories (product_id, category_id)
select pr.id, c.id
from (values
  ('DEMO-OLI-001', 'oli-motor'), ('DEMO-OLI-002', 'oli-motor'),
  ('DEMO-REM-001', 'rem-motor'), ('DEMO-REM-002', 'rem-motor'),
  ('DEMO-LMP-001', 'lampu-motor'), ('DEMO-AKS-001', 'aksesoris-motor'), ('DEMO-AKS-002', 'aksesoris-motor'),
  ('DEMO-OLI-101', 'oli-mobil'), ('DEMO-WPR-101', 'wiper'), ('DEMO-LMP-101', 'lampu-mobil'),
  ('DEMO-INT-101', 'aksesoris-interior'), ('DEMO-INT-102', 'aksesoris-interior'),
  ('DEMO-CARE-001', 'perawatan-kebersihan'), ('DEMO-CARE-002', 'perawatan-kebersihan'),
  ('DEMO-TOOL-001', 'peralatan')
) as x(sku, category_slug)
join public.products pr on pr.sku = x.sku
join public.categories c on c.slug = x.category_slug
on conflict do nothing;

-- Fitment (produk umum tanpa fitment tidak muncul di filter kecocokan)
insert into public.product_fitments (product_id, model_id, year_start, year_end)
select pr.id, vm.id, f.y1, f.y2
from (values
  ('DEMO-OLI-001', 'honda', 'beat', 2008, null),
  ('DEMO-OLI-001', 'honda', 'vario-125', 2012, null),
  ('DEMO-OLI-001', 'yamaha', 'nmax', 2015, null),
  ('DEMO-OLI-002', 'honda', 'beat', 2008, null),
  ('DEMO-OLI-002', 'yamaha', 'mio-m3', 2014, null),
  ('DEMO-REM-001', 'honda', 'vario-125', 2012, 2022),
  ('DEMO-REM-001', 'honda', 'pcx-160', 2021, null),
  ('DEMO-REM-002', 'honda', 'supra-x-125', 2005, null),
  ('DEMO-LMP-001', 'yamaha', 'r15', 2014, null),
  ('DEMO-LMP-001', 'kawasaki', 'ninja-250', 2008, null),
  ('DEMO-OLI-101', 'toyota', 'avanza', 2012, null),
  ('DEMO-OLI-101', 'daihatsu', 'xenia', 2012, null),
  ('DEMO-OLI-101', 'mitsubishi', 'xpander', 2017, null),
  ('DEMO-WPR-101', 'toyota', 'calya', 2016, null),
  ('DEMO-WPR-101', 'honda', 'brio', 2012, null),
  ('DEMO-LMP-101', 'suzuki', 'ertiga', 2012, null),
  ('DEMO-INT-101', 'toyota', 'innova-reborn', 2016, null)
) as f(sku, make_slug, model_slug, y1, y2)
join public.products pr on pr.sku = f.sku
join public.vehicle_makes mk on mk.slug = f.make_slug
join public.vehicle_models vm on vm.make_id = mk.id and vm.slug = f.model_slug
on conflict do nothing;

-- Spesifikasi
insert into public.product_specs (product_id, label, value, sort_order)
select pr.id, s.label, s.value, s.sort_order
from (values
  ('DEMO-OLI-001', 'Viskositas', '10W-30', 1),
  ('DEMO-OLI-001', 'Volume', '0.8 L', 2),
  ('DEMO-OLI-001', 'Standar', 'JASO MB', 3),
  ('DEMO-OLI-101', 'Viskositas', '5W-30', 1),
  ('DEMO-OLI-101', 'Volume', '4 L', 2),
  ('DEMO-LMP-001', 'Daya', '35 W', 1),
  ('DEMO-LMP-001', 'Warna', '6000 K', 2),
  ('DEMO-WPR-101', 'Tipe', 'Frameless', 1)
) as s(sku, label, value, sort_order)
join public.products pr on pr.sku = s.sku
where not exists (
  select 1 from public.product_specs ps where ps.product_id = pr.id and ps.label = s.label
);

-- Stok awal lewat ledger (sekali saja per produk/varian)
insert into public.inventory_movements (product_id, variant_id, quantity, type, reason)
select pr.id, null, x.qty, 'initial', 'Stok awal seed'
from (values
  ('DEMO-OLI-001', 120), ('DEMO-OLI-002', 80), ('DEMO-REM-001', 40), ('DEMO-REM-002', 3),
  ('DEMO-LMP-001', 25), ('DEMO-OLI-101', 30), ('DEMO-LMP-101', 12), ('DEMO-INT-101', 8),
  ('DEMO-CARE-001', 60), ('DEMO-CARE-002', 100), ('DEMO-TOOL-001', 15), ('DEMO-AKS-002', 50),
  ('DEMO-INT-102', 5)
) as x(sku, qty)
join public.products pr on pr.sku = x.sku
where not exists (select 1 from public.inventory_movements im where im.product_id = pr.id);

insert into public.inventory_movements (product_id, variant_id, quantity, type, reason)
select v.product_id, v.id, x.qty, 'initial', 'Stok awal seed'
from (values
  ('DEMO-WPR-101-14', 20), ('DEMO-WPR-101-18', 0), ('DEMO-WPR-101-22', 10),
  ('DEMO-AKS-001-BLK', 30), ('DEMO-AKS-001-CRM', 4)
) as x(sku, qty)
join public.product_variants v on v.sku = x.sku
where x.qty > 0
  and not exists (select 1 from public.inventory_movements im where im.variant_id = v.id);

select set_config('nzo.skip_audit', 'off', false);
