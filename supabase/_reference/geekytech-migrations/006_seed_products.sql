-- ============================================================
-- 006_seed_products.sql
-- GeekyTech — 10 Sample Products
-- Gunakan subquery category slug agar tidak hardcode UUID
-- ============================================================

DO $$
DECLARE
  v_cat_smartphone  uuid := (SELECT id FROM categories WHERE slug = 'smartphone');
  v_cat_laptop      uuid := (SELECT id FROM categories WHERE slug = 'laptop');
  v_cat_tablet      uuid := (SELECT id FROM categories WHERE slug = 'tablet');
  v_cat_audio       uuid := (SELECT id FROM categories WHERE slug = 'audio');
  v_cat_aksesori    uuid := (SELECT id FROM categories WHERE slug = 'aksesori');
  v_cat_smartwatch  uuid := (SELECT id FROM categories WHERE slug = 'smartwatch');
  v_cat_gaming      uuid := (SELECT id FROM categories WHERE slug = 'gaming');
  v_cat_kamera      uuid := (SELECT id FROM categories WHERE slug = 'kamera');

  -- Product IDs
  p1 uuid; p2 uuid; p3 uuid; p4 uuid; p5 uuid;
  p6 uuid; p7 uuid; p8 uuid; p9 uuid; p10 uuid;
BEGIN

  -- ===========================================================
  -- 1. Samsung Galaxy A55 5G
  -- ===========================================================
  INSERT INTO products (name, slug, description, category_id, base_price, is_active, meta_title, meta_description)
  VALUES (
    'Samsung Galaxy A55 5G',
    'samsung-galaxy-a55-5g',
    'Samsung Galaxy A55 5G hadir dengan layar Super AMOLED 6.6 inci FHD+, prosesor Exynos 1480, kamera utama 50MP OIS, dan baterai 5000mAh dengan fast charging 25W. Dibekali RAM 8GB dan penyimpanan 256GB.',
    v_cat_smartphone, 4999000, true,
    'Samsung Galaxy A55 5G - Harga Terbaik | GeekyTech',
    'Beli Samsung Galaxy A55 5G harga terbaik di GeekyTech. Garansi resmi Samsung Indonesia. Cicilan 0%.'
  ) RETURNING id INTO p1;

  INSERT INTO product_variants (product_id, name, sku, price, stock, weight, length, width, height)
  VALUES
    (p1, '8GB/128GB - Awesome Iceblue', 'SGS-A55-8-128-BLUE', 4599000, 15, 213, 16, 8, 4),
    (p1, '8GB/256GB - Awesome Lilac',   'SGS-A55-8-256-LILAC', 4999000, 12, 213, 16, 8, 4);

  INSERT INTO product_images (product_id, url, alt_text, sort_order, is_primary)
  VALUES (p1, 'https://placehold.co/800x800/1428A0/FFFFFF?text=Galaxy+A55', 'Samsung Galaxy A55 5G', 0, true);

  INSERT INTO product_tags (product_id, tag) VALUES
    (p1, 'samsung'), (p1, 'smartphone'), (p1, '5g'), (p1, 'android');

  -- ===========================================================
  -- 2. iPhone 15 128GB
  -- ===========================================================
  INSERT INTO products (name, slug, description, category_id, base_price, is_active, meta_title, meta_description)
  VALUES (
    'iPhone 15 128GB',
    'iphone-15-128gb',
    'iPhone 15 menghadirkan chip A16 Bionic, kamera utama 48MP dengan Dynamic Island, layar Super Retina XDR 6.1 inci, dan port USB-C. Baterai tahan seharian penuh dengan fast charging 20W.',
    v_cat_smartphone, 10999000, true,
    'iPhone 15 128GB - Harga Resmi Apple | GeekyTech',
    'Beli iPhone 15 128GB di GeekyTech. Garansi resmi Apple Indonesia. Pengiriman cepat ke seluruh Indonesia.'
  ) RETURNING id INTO p2;

  INSERT INTO product_variants (product_id, name, sku, price, stock, weight, length, width, height)
  VALUES
    (p2, '128GB - Pink',  'APL-IP15-128-PINK',  10999000, 8, 174, 15, 8, 4),
    (p2, '128GB - Black', 'APL-IP15-128-BLACK', 10999000, 10, 174, 15, 8, 4),
    (p2, '256GB - Blue',  'APL-IP15-256-BLUE',  12999000, 6, 174, 15, 8, 4);

  INSERT INTO product_images (product_id, url, alt_text, sort_order, is_primary)
  VALUES (p2, 'https://placehold.co/800x800/1C1C1E/FFFFFF?text=iPhone+15', 'iPhone 15 128GB', 0, true);

  INSERT INTO product_tags (product_id, tag) VALUES
    (p2, 'apple'), (p2, 'iphone'), (p2, 'smartphone'), (p2, 'ios');

  -- ===========================================================
  -- 3. ASUS VivoBook 15 OLED
  -- ===========================================================
  INSERT INTO products (name, slug, description, category_id, base_price, is_active, meta_title, meta_description)
  VALUES (
    'ASUS VivoBook 15 OLED',
    'asus-vivobook-15-oled',
    'ASUS VivoBook 15 OLED hadir dengan layar OLED 15.6 inci FHD 120Hz, prosesor Intel Core i5-13500H, RAM 16GB LPDDR5, SSD 512GB NVMe, dan grafis Intel Iris Xe. Bobot ringan 1.7kg dengan baterai 70Wh.',
    v_cat_laptop, 8999000, true,
    'ASUS VivoBook 15 OLED i5 - Laptop OLED Terjangkau | GeekyTech',
    'ASUS VivoBook 15 OLED layar OLED 120Hz, Intel Core i5, RAM 16GB. Beli sekarang di GeekyTech.'
  ) RETURNING id INTO p3;

  INSERT INTO product_variants (product_id, name, sku, price, stock, weight, length, width, height)
  VALUES
    (p3, 'i5-13500H / 16GB / 512GB - Indie Black', 'ASUS-VB15-I5-512-BLK', 8999000, 7, 1700, 36, 23, 2);

  INSERT INTO product_images (product_id, url, alt_text, sort_order, is_primary)
  VALUES (p3, 'https://placehold.co/800x800/2D2D2D/FFFFFF?text=VivoBook+15', 'ASUS VivoBook 15 OLED', 0, true);

  INSERT INTO product_tags (product_id, tag) VALUES
    (p3, 'asus'), (p3, 'laptop'), (p3, 'oled'), (p3, 'intel');

  -- ===========================================================
  -- 4. iPad Air M2
  -- ===========================================================
  INSERT INTO products (name, slug, description, category_id, base_price, is_active, meta_title, meta_description)
  VALUES (
    'iPad Air M2 11 Inch',
    'ipad-air-m2-11-inch',
    'iPad Air M2 11 inci hadir dengan chip M2 yang powerful, layar Liquid Retina 11 inci, dukungan Apple Pencil Pro dan Magic Keyboard. Tersedia dalam pilihan warna yang menarik dengan konektivitas Wi-Fi 6E.',
    v_cat_tablet, 9499000, true,
    'iPad Air M2 11 Inch - Tablet Apple Terbaik | GeekyTech',
    'Beli iPad Air M2 11 inci di GeekyTech. Garansi resmi Apple. Cicilan 0% tersedia.'
  ) RETURNING id INTO p4;

  INSERT INTO product_variants (product_id, name, sku, price, stock, weight, length, width, height)
  VALUES
    (p4, '128GB Wi-Fi - Blue',   'APL-IPAIR-M2-128-BLUE', 9499000,  6, 462, 25, 19, 1),
    (p4, '256GB Wi-Fi - Purple', 'APL-IPAIR-M2-256-PURP', 11499000, 4, 462, 25, 19, 1);

  INSERT INTO product_images (product_id, url, alt_text, sort_order, is_primary)
  VALUES (p4, 'https://placehold.co/800x800/0071E3/FFFFFF?text=iPad+Air+M2', 'iPad Air M2 11 Inch', 0, true);

  INSERT INTO product_tags (product_id, tag) VALUES
    (p4, 'apple'), (p4, 'ipad'), (p4, 'tablet'), (p4, 'm2');

  -- ===========================================================
  -- 5. Sony WH-1000XM5
  -- ===========================================================
  INSERT INTO products (name, slug, description, category_id, base_price, is_active, meta_title, meta_description)
  VALUES (
    'Sony WH-1000XM5 Wireless Headphone',
    'sony-wh-1000xm5',
    'Sony WH-1000XM5 adalah headphone over-ear flagship dengan Active Noise Cancellation terbaik di kelasnya, konektivitas Bluetooth 5.2, codec LDAC, dan daya tahan baterai hingga 30 jam. Desain lipat ringan 250g.',
    v_cat_audio, 4299000, true,
    'Sony WH-1000XM5 - Headphone ANC Terbaik | GeekyTech',
    'Sony WH-1000XM5 headphone noise cancelling terbaik. Beli di GeekyTech dengan garansi resmi Sony Indonesia.'
  ) RETURNING id INTO p5;

  INSERT INTO product_variants (product_id, name, sku, price, stock, weight, length, width, height)
  VALUES
    (p5, 'Black', 'SNY-WH1000XM5-BLK', 4299000, 9, 250, 20, 18, 8),
    (p5, 'Silver', 'SNY-WH1000XM5-SLV', 4299000, 6, 250, 20, 18, 8);

  INSERT INTO product_images (product_id, url, alt_text, sort_order, is_primary)
  VALUES (p5, 'https://placehold.co/800x800/1A1A1A/FFFFFF?text=WH-1000XM5', 'Sony WH-1000XM5', 0, true);

  INSERT INTO product_tags (product_id, tag) VALUES
    (p5, 'sony'), (p5, 'headphone'), (p5, 'audio'), (p5, 'noise-cancelling'), (p5, 'bluetooth');

  -- ===========================================================
  -- 6. Apple Watch Series 9
  -- ===========================================================
  INSERT INTO products (name, slug, description, category_id, base_price, is_active, meta_title, meta_description)
  VALUES (
    'Apple Watch Series 9 41mm',
    'apple-watch-series-9-41mm',
    'Apple Watch Series 9 hadir dengan chip S9 SiP yang 60% lebih cepat, fitur Double Tap baru, layar always-on hingga 2000 nits, dan sensor kesehatan canggih. Water resistant 50m dengan baterai seharian penuh.',
    v_cat_smartwatch, 6499000, true,
    'Apple Watch Series 9 41mm - Smartwatch Apple | GeekyTech',
    'Apple Watch Series 9 41mm chip S9, Double Tap, layar 2000 nits. Beli di GeekyTech garansi resmi Apple.'
  ) RETURNING id INTO p6;

  INSERT INTO product_variants (product_id, name, sku, price, stock, weight, length, width, height)
  VALUES
    (p6, '41mm Aluminum Midnight - Sport Band', 'APL-AWS9-41-MID-SP',  6499000, 8, 32, 15, 13, 4),
    (p6, '41mm Aluminum Starlight - Sport Band', 'APL-AWS9-41-STL-SP', 6499000, 7, 32, 15, 13, 4);

  INSERT INTO product_images (product_id, url, alt_text, sort_order, is_primary)
  VALUES (p6, 'https://placehold.co/800x800/1C1C1E/FFFFFF?text=Watch+S9', 'Apple Watch Series 9', 0, true);

  INSERT INTO product_tags (product_id, tag) VALUES
    (p6, 'apple'), (p6, 'smartwatch'), (p6, 'wearable'), (p6, 'ios');

  -- ===========================================================
  -- 7. Logitech G502 X Gaming Mouse
  -- ===========================================================
  INSERT INTO products (name, slug, description, category_id, base_price, is_active, meta_title, meta_description)
  VALUES (
    'Logitech G502 X Wired Gaming Mouse',
    'logitech-g502-x-wired',
    'Logitech G502 X menggunakan sensor HERO 25K dengan akurasi 25.600 DPI, 13 tombol yang dapat diprogram, bobot 89g, dan koneksi USB wired. Desain ergonomis untuk gaming marathon.',
    v_cat_gaming, 899000, true,
    'Logitech G502 X Gaming Mouse - Sensor HERO 25K | GeekyTech',
    'Logitech G502 X wired gaming mouse sensor HERO 25K, 25600 DPI. Beli di GeekyTech harga terbaik.'
  ) RETURNING id INTO p7;

  INSERT INTO product_variants (product_id, name, sku, price, stock, weight, length, width, height)
  VALUES
    (p7, 'Black', 'LGT-G502X-BLK', 899000, 20, 89, 22, 13, 8),
    (p7, 'White', 'LGT-G502X-WHT', 899000, 15, 89, 22, 13, 8);

  INSERT INTO product_images (product_id, url, alt_text, sort_order, is_primary)
  VALUES (p7, 'https://placehold.co/800x800/000000/FFFFFF?text=G502+X', 'Logitech G502 X', 0, true);

  INSERT INTO product_tags (product_id, tag) VALUES
    (p7, 'logitech'), (p7, 'gaming'), (p7, 'mouse'), (p7, 'peripheral');

  -- ===========================================================
  -- 8. GoPro HERO12 Black
  -- ===========================================================
  INSERT INTO products (name, slug, description, category_id, base_price, is_active, meta_title, meta_description)
  VALUES (
    'GoPro HERO12 Black',
    'gopro-hero12-black',
    'GoPro HERO12 Black mampu merekam video 5.3K60 dan foto 27MP dengan HyperSmooth 6.0 yang luar biasa halus. Tahan air hingga 10m tanpa housing, baterai Enduro, dan layar sentuh depan-belakang.',
    v_cat_kamera, 5299000, true,
    'GoPro HERO12 Black - Action Camera 5.3K | GeekyTech',
    'GoPro HERO12 Black action camera 5.3K60, HyperSmooth 6.0, tahan air 10m. Beli di GeekyTech.'
  ) RETURNING id INTO p8;

  INSERT INTO product_variants (product_id, name, sku, price, stock, weight, length, width, height)
  VALUES
    (p8, 'Standard Bundle', 'GPR-HERO12-STD', 5299000, 10, 158, 12, 7, 5);

  INSERT INTO product_images (product_id, url, alt_text, sort_order, is_primary)
  VALUES (p8, 'https://placehold.co/800x800/1B1B1B/FFFFFF?text=GoPro+HERO12', 'GoPro HERO12 Black', 0, true);

  INSERT INTO product_tags (product_id, tag) VALUES
    (p8, 'gopro'), (p8, 'kamera'), (p8, 'action-camera'), (p8, '4k');

  -- ===========================================================
  -- 9. Samsung 45W USB-C Charger
  -- ===========================================================
  INSERT INTO products (name, slug, description, category_id, base_price, is_active, meta_title, meta_description)
  VALUES (
    'Samsung 45W USB-C Super Fast Charger',
    'samsung-45w-usbc-charger',
    'Charger resmi Samsung 45W Super Fast Charging 2.0 dengan konektor USB-C. Kompatibel dengan Samsung Galaxy S series, Note, Tab, dan perangkat USB-C lainnya. Desain compact dengan kabel USB-C to USB-C 1.8m.',
    v_cat_aksesori, 249000, true,
    'Samsung 45W USB-C Charger - Super Fast Charging | GeekyTech',
    'Samsung 45W USB-C Super Fast Charger resmi. Beli di GeekyTech dengan garansi Samsung Indonesia.'
  ) RETURNING id INTO p9;

  INSERT INTO product_variants (product_id, name, sku, price, stock, weight, length, width, height)
  VALUES
    (p9, 'White - With Cable', 'SGS-CHR-45W-WHT', 249000, 50, 120, 8, 5, 3);

  INSERT INTO product_images (product_id, url, alt_text, sort_order, is_primary)
  VALUES (p9, 'https://placehold.co/800x800/F5F5F5/000000?text=45W+Charger', 'Samsung 45W USB-C Charger', 0, true);

  INSERT INTO product_tags (product_id, tag) VALUES
    (p9, 'samsung'), (p9, 'charger'), (p9, 'aksesori'), (p9, 'usb-c');

  -- ===========================================================
  -- 10. Anker PowerCore 26800mAh
  -- ===========================================================
  INSERT INTO products (name, slug, description, category_id, base_price, is_active, meta_title, meta_description)
  VALUES (
    'Anker PowerCore 26800mAh Power Bank',
    'anker-powercore-26800',
    'Anker PowerCore 26800mAh adalah power bank kapasitas besar dengan dual input (Micro-USB + USB-C), 3 output USB-A, teknologi PowerIQ 3.0, dan proteksi lengkap. Bisa charge smartphone hingga 6-7x penuh.',
    v_cat_aksesori, 599000, true,
    'Anker PowerCore 26800mAh - Power Bank Kapasitas Besar | GeekyTech',
    'Anker PowerCore 26800mAh power bank 3 port USB dengan PowerIQ. Beli di GeekyTech harga terbaik.'
  ) RETURNING id INTO p10;

  INSERT INTO product_variants (product_id, name, sku, price, stock, weight, length, width, height)
  VALUES
    (p10, 'Black', 'ANK-PC26800-BLK', 599000, 25, 495, 17, 8, 3),
    (p10, 'White', 'ANK-PC26800-WHT', 599000, 20, 495, 17, 8, 3);

  INSERT INTO product_images (product_id, url, alt_text, sort_order, is_primary)
  VALUES (p10, 'https://placehold.co/800x800/333333/FFFFFF?text=PowerCore+26800', 'Anker PowerCore 26800mAh', 0, true);

  INSERT INTO product_tags (product_id, tag) VALUES
    (p10, 'anker'), (p10, 'power-bank'), (p10, 'aksesori'), (p10, 'portable-charger');

END $$;
