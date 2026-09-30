-- ============================================================
-- 024_approve_existing_reviews.sql
-- Approve semua ulasan yang belum disetujui dan belum dihapus.
-- Trigger update_product_rating akan otomatis menghitung ulang
-- average_rating dan review_count pada tabel products untuk
-- setiap produk yang terdampak.
-- ============================================================

UPDATE product_reviews
SET is_approved = true
WHERE is_approved = false
  AND deleted_at IS NULL;
