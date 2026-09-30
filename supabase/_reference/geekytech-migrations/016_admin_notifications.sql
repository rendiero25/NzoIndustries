-- ============================================================
-- 016_admin_notifications.sql
-- Tabel notifikasi untuk admin (shared — tidak terikat user_id)
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  body        text NOT NULL,
  type        text NOT NULL,
  data        jsonb,
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_notifications_created_at_idx
  ON admin_notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS admin_notifications_is_read_idx
  ON admin_notifications (is_read)
  WHERE is_read = false;

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Hanya admin yang bisa membaca dan mengupdate
CREATE POLICY "admin_notifications_admin_only" ON admin_notifications
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
