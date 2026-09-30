-- ============================================================
-- 004_rls.sql
-- GeekyTech — Row Level Security
-- ============================================================
-- Helper: is_admin() — cek role dari profiles (bukan raw_user_meta_data)
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 1. profiles
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (auth.uid() = id OR is_admin());

-- ============================================================
-- 2. addresses
-- ============================================================
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addresses_all_own" ON addresses FOR ALL
  USING (auth.uid() = user_id OR is_admin());

-- ============================================================
-- 3. categories
-- ============================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_public" ON categories FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "categories_write_admin" ON categories FOR ALL
  USING (is_admin());

-- ============================================================
-- 4. products
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select_public" ON products FOR SELECT
  USING ((is_active = true AND deleted_at IS NULL) OR is_admin());

CREATE POLICY "products_write_admin" ON products FOR ALL
  USING (is_admin());

-- ============================================================
-- 5. product_images
-- ============================================================
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_images_select_public" ON product_images FOR SELECT
  USING (true);

CREATE POLICY "product_images_write_admin" ON product_images FOR ALL
  USING (is_admin());

-- ============================================================
-- 6. product_variants
-- ============================================================
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_variants_select_public" ON product_variants FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "product_variants_write_admin" ON product_variants FOR ALL
  USING (is_admin());

-- ============================================================
-- 7. product_tags
-- ============================================================
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_tags_select_public" ON product_tags FOR SELECT
  USING (true);

CREATE POLICY "product_tags_write_admin" ON product_tags FOR ALL
  USING (is_admin());

-- ============================================================
-- 8. product_views
-- ============================================================
ALTER TABLE product_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_views_insert_any" ON product_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "product_views_select_own" ON product_views FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

-- ============================================================
-- 9. wishlists
-- ============================================================
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wishlists_all_own" ON wishlists FOR ALL
  USING (auth.uid() = user_id OR is_admin());

-- ============================================================
-- 10. carts
-- ============================================================
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carts_all_own" ON carts FOR ALL
  USING (auth.uid() = user_id OR is_admin());

-- ============================================================
-- 11. cart_items
-- ============================================================
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cart_items_all_own" ON cart_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()
    )
    OR is_admin()
  );

-- ============================================================
-- 12. coupons
-- ============================================================
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons_select_active" ON coupons FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "coupons_write_admin" ON coupons FOR ALL
  USING (is_admin());

-- ============================================================
-- 13. orders
-- ============================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_own" ON orders FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "orders_insert_own" ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "orders_update_own_or_admin" ON orders FOR UPDATE
  USING (auth.uid() = user_id OR is_admin());

-- ============================================================
-- 14. order_items
-- ============================================================
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_select_own" ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "order_items_insert_own" ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
    OR is_admin()
  );

-- ============================================================
-- 15. coupon_usages
-- ============================================================
ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupon_usages_all_own" ON coupon_usages FOR ALL
  USING (auth.uid() = user_id OR is_admin());

-- ============================================================
-- 16. order_status_history
-- ============================================================
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_status_history_select_own" ON order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_status_history.order_id AND orders.user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "order_status_history_insert_admin" ON order_status_history FOR INSERT
  WITH CHECK (is_admin());

-- ============================================================
-- 17. payments
-- ============================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select_own" ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id AND orders.user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "payments_write_admin" ON payments FOR ALL
  USING (is_admin());

-- ============================================================
-- 18. shipments
-- ============================================================
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shipments_select_own" ON shipments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = shipments.order_id AND orders.user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "shipments_write_admin" ON shipments FOR ALL
  USING (is_admin());

-- ============================================================
-- 19. product_reviews
-- ============================================================
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_reviews_select_approved" ON product_reviews FOR SELECT
  USING ((is_approved = true AND deleted_at IS NULL) OR auth.uid() = user_id OR is_admin());

CREATE POLICY "product_reviews_insert_own" ON product_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "product_reviews_update_own" ON product_reviews FOR UPDATE
  USING (auth.uid() = user_id OR is_admin());

-- ============================================================
-- 20. notifications
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_all_own" ON notifications FOR ALL
  USING (auth.uid() = user_id OR is_admin());

-- ============================================================
-- 21. banners
-- ============================================================
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banners_select_active" ON banners FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "banners_write_admin" ON banners FOR ALL
  USING (is_admin());

-- ============================================================
-- 22. flash_sales
-- ============================================================
ALTER TABLE flash_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flash_sales_select_public" ON flash_sales FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "flash_sales_write_admin" ON flash_sales FOR ALL
  USING (is_admin());

-- ============================================================
-- 23. flash_sale_products
-- ============================================================
ALTER TABLE flash_sale_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flash_sale_products_select_public" ON flash_sale_products FOR SELECT
  USING (true);

CREATE POLICY "flash_sale_products_write_admin" ON flash_sale_products FOR ALL
  USING (is_admin());

-- ============================================================
-- 24. complaints
-- ============================================================
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "complaints_all_own" ON complaints FOR ALL
  USING (auth.uid() = user_id OR is_admin());

-- ============================================================
-- 25. stock_history
-- ============================================================
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_history_admin_only" ON stock_history FOR ALL
  USING (is_admin());

-- ============================================================
-- 26. settings
-- ============================================================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select_public" ON settings FOR SELECT
  USING (true);

CREATE POLICY "settings_write_admin" ON settings FOR ALL
  USING (is_admin());

-- ============================================================
-- 27. faqs
-- ============================================================
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faqs_select_active" ON faqs FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "faqs_write_admin" ON faqs FOR ALL
  USING (is_admin());
