-- ============================================================
-- Produk yang ada di wishlist pengguna tetap bisa dibaca (SELECT)
-- supaya halaman /dashboard/wishlist tidak kosong bila produk
-- sudah nonaktif atau diarsipkan (deleted_at), sambil tetap
-- memakai kebijakan publik untuk katalog umum.
-- ============================================================
CREATE POLICY "products_select_if_in_my_wishlist" ON products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wishlists
      WHERE wishlists.product_id = products.id
        AND wishlists.user_id = auth.uid()
    )
  );
