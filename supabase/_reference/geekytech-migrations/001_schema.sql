-- ============================================================
-- 001_schema.sql
-- GeekyTech — ENUMs + Semua Tabel
-- ============================================================

-- ENUMs
CREATE TYPE order_status AS ENUM (
  'pending_payment',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'refunded'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'paid',
  'failed',
  'expired',
  'cancelled',
  'refunded',
  'challenge'
);

CREATE TYPE shipment_status AS ENUM (
  'pending',
  'confirmed',
  'allocated',
  'picking_up',
  'picked',
  'dropping_off',
  'delivered',
  'rejected',
  'cancelled',
  'returned'
);

-- ============================================================
-- 1. profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text,
  phone       text,
  avatar_url  text,
  role        text NOT NULL DEFAULT 'customer',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

-- ============================================================
-- 2. categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  image_url   text,
  parent_id   uuid REFERENCES categories(id) ON DELETE SET NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  slug              text UNIQUE NOT NULL,
  description       text,
  category_id       uuid REFERENCES categories(id) ON DELETE SET NULL,
  base_price        numeric(12,2) NOT NULL,
  sale_price        numeric(12,2),
  is_featured       boolean NOT NULL DEFAULT false,
  is_active         boolean NOT NULL DEFAULT true,
  min_order_qty     integer NOT NULL DEFAULT 1,
  total_sold        integer NOT NULL DEFAULT 0,
  average_rating    numeric(3,2) NOT NULL DEFAULT 0,
  review_count      integer NOT NULL DEFAULT 0,
  meta_title        text,
  meta_description  text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

-- ============================================================
-- 4. addresses
-- ============================================================
CREATE TABLE IF NOT EXISTS addresses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES profiles(id) ON DELETE CASCADE,
  label         text,
  recipient     text NOT NULL,
  phone         text NOT NULL,
  province      text NOT NULL,
  city          text NOT NULL,
  district      text NOT NULL,
  postal_code   text NOT NULL,
  full_address  text NOT NULL,
  is_default    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. product_images
-- ============================================================
CREATE TABLE IF NOT EXISTS product_images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         text NOT NULL,
  alt_text    text,
  sort_order  integer NOT NULL DEFAULT 0,
  is_primary  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. product_variants
-- ============================================================
CREATE TABLE IF NOT EXISTS product_variants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name        text NOT NULL,
  sku         text UNIQUE NOT NULL,
  price       numeric(12,2) NOT NULL,
  stock       integer NOT NULL DEFAULT 0,
  reserved    integer NOT NULL DEFAULT 0,
  weight      integer NOT NULL,
  length      integer NOT NULL DEFAULT 0,
  width       integer NOT NULL DEFAULT 0,
  height      integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. product_tags
-- ============================================================
CREATE TABLE IF NOT EXISTS product_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag         text NOT NULL
);

-- ============================================================
-- 8. product_views
-- ============================================================
CREATE TABLE IF NOT EXISTS product_views (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  session_id  text,
  viewed_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. wishlists
-- ============================================================
CREATE TABLE IF NOT EXISTS wishlists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- ============================================================
-- 10. carts
-- ============================================================
CREATE TABLE IF NOT EXISTS carts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 11. cart_items
-- ============================================================
CREATE TABLE IF NOT EXISTS cart_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id     uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id  uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity    integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cart_id, variant_id)
);

-- ============================================================
-- 12. coupons
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text UNIQUE NOT NULL,
  type            text NOT NULL,
  value           numeric(12,2) NOT NULL,
  min_purchase    numeric(12,2) NOT NULL DEFAULT 0,
  max_discount    numeric(12,2),
  max_usage       integer,
  used_count      integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  valid_from      timestamptz,
  valid_until     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 13. orders
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number        text UNIQUE NOT NULL DEFAULT '',
  user_id             uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status              order_status NOT NULL DEFAULT 'pending_payment',
  recipient_name      text NOT NULL,
  recipient_phone     text NOT NULL,
  shipping_province   text NOT NULL,
  shipping_city       text NOT NULL,
  shipping_district   text NOT NULL,
  shipping_postal     text NOT NULL,
  shipping_address    text NOT NULL,
  subtotal            numeric(12,2) NOT NULL,
  shipping_cost       numeric(12,2) NOT NULL DEFAULT 0,
  shipping_insurance  numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount     numeric(12,2) NOT NULL DEFAULT 0,
  total               numeric(12,2) NOT NULL,
  courier_company     text,
  courier_service     text,
  courier_etd         text,
  notes               text,
  coupon_id           uuid REFERENCES coupons(id) ON DELETE SET NULL,
  coupon_code         text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 14. order_items
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id    uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name  text NOT NULL,
  variant_name  text NOT NULL,
  sku           text NOT NULL,
  price         numeric(12,2) NOT NULL,
  quantity      integer NOT NULL,
  subtotal      numeric(12,2) NOT NULL,
  weight        integer NOT NULL,
  image_url     text
);

-- ============================================================
-- 15. coupon_usages
-- ============================================================
CREATE TABLE IF NOT EXISTS coupon_usages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  used_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coupon_id, user_id)
);

-- ============================================================
-- 16. order_status_history
-- ============================================================
CREATE TABLE IF NOT EXISTS order_status_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status      order_status NOT NULL,
  note        text,
  changed_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 17. payments
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  midtrans_order_id       text UNIQUE NOT NULL,
  midtrans_transaction_id text,
  payment_type            text,
  status                  payment_status NOT NULL DEFAULT 'pending',
  gross_amount            numeric(12,2) NOT NULL,
  va_number               text,
  payment_code            text,
  pdf_url                 text,
  expiry_time             timestamptz,
  paid_at                 timestamptz,
  raw_response            jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 18. shipments
-- ============================================================
CREATE TABLE IF NOT EXISTS shipments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  biteship_order_id   text,
  awb                 text,
  courier_company     text NOT NULL,
  courier_service     text NOT NULL,
  courier_name        text,
  status              shipment_status NOT NULL DEFAULT 'pending',
  tracking_history    jsonb NOT NULL DEFAULT '[]',
  estimated_delivery  text,
  picked_up_at        timestamptz,
  delivered_at        timestamptz,
  raw_response        jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 19. product_reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS product_reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id    uuid REFERENCES orders(id) ON DELETE SET NULL,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating      integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     text,
  is_approved boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

-- ============================================================
-- 20. notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       text NOT NULL,
  body        text NOT NULL,
  type        text NOT NULL,
  data        jsonb,
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 21. banners
-- ============================================================
CREATE TABLE IF NOT EXISTS banners (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text,
  subtitle    text,
  image_url   text NOT NULL,
  link_url    text,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 22. flash_sales
-- ============================================================
CREATE TABLE IF NOT EXISTS flash_sales (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 23. flash_sale_products
-- ============================================================
CREATE TABLE IF NOT EXISTS flash_sale_products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flash_sale_id   uuid NOT NULL REFERENCES flash_sales(id) ON DELETE CASCADE,
  variant_id      uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  sale_price      numeric(12,2) NOT NULL,
  quota           integer NOT NULL,
  sold            integer NOT NULL DEFAULT 0
);

-- ============================================================
-- 24. complaints
-- ============================================================
CREATE TABLE IF NOT EXISTS complaints (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        text NOT NULL,
  reason      text NOT NULL,
  description text,
  images      jsonb NOT NULL DEFAULT '[]',
  status      text NOT NULL DEFAULT 'open',
  admin_note  text,
  resolved_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 25. stock_history
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id  uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  type        text NOT NULL,
  quantity    integer NOT NULL,
  note        text,
  order_id    uuid REFERENCES orders(id) ON DELETE SET NULL,
  changed_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 26. settings
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text UNIQUE NOT NULL,
  value       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 27. faqs
-- ============================================================
CREATE TABLE IF NOT EXISTS faqs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question    text NOT NULL,
  answer      text NOT NULL,
  category    text,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
