-- Keep product rating summaries aligned with public product_reviews data.
-- Also repairs summaries written before the trigger existed in production.

CREATE OR REPLACE FUNCTION recalculate_product_rating(target_product_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET
    average_rating = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM product_reviews
      WHERE product_id = target_product_id
        AND is_approved = true
        AND deleted_at IS NULL
    ), 0),
    review_count = (
      SELECT COUNT(*)
      FROM product_reviews
      WHERE product_id = target_product_id
        AND is_approved = true
        AND deleted_at IS NULL
    )
  WHERE id = target_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION sync_product_rating_from_review()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_product_rating(OLD.product_id);
    RETURN OLD;
  END IF;

  PERFORM recalculate_product_rating(NEW.product_id);

  IF TG_OP = 'UPDATE' AND OLD.product_id IS DISTINCT FROM NEW.product_id THEN
    PERFORM recalculate_product_rating(OLD.product_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS after_review_upsert ON product_reviews;
CREATE TRIGGER after_review_sync_product_rating
  AFTER INSERT OR UPDATE OR DELETE ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION sync_product_rating_from_review();

-- Backfill all existing products so public surfaces show current rating now.
UPDATE products AS p
SET
  average_rating = COALESCE((
    SELECT ROUND(AVG(pr.rating)::numeric, 2)
    FROM product_reviews AS pr
    WHERE pr.product_id = p.id
      AND pr.is_approved = true
      AND pr.deleted_at IS NULL
  ), 0),
  review_count = (
    SELECT COUNT(*)
    FROM product_reviews AS pr
    WHERE pr.product_id = p.id
      AND pr.is_approved = true
      AND pr.deleted_at IS NULL
  );
