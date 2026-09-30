-- supabase/migrations/018_chat_system.sql
-- Chat system: sessions, messages, attachments, quick_replies

-- chat_sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  subject     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  closed_at   timestamptz
);

CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx ON chat_sessions (user_id);
CREATE INDEX IF NOT EXISTS chat_sessions_status_idx ON chat_sessions (status);
CREATE INDEX IF NOT EXISTS chat_sessions_updated_at_idx ON chat_sessions (updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS chat_sessions_one_open_per_user_idx
  ON chat_sessions (user_id)
  WHERE status = 'open';

-- chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_role  text NOT NULL CHECK (sender_role IN ('user', 'admin', 'system')),
  content      text,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  reactions    jsonb NOT NULL DEFAULT '{}',
  is_read      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON chat_messages (session_id, created_at);
CREATE INDEX IF NOT EXISTS chat_messages_unread_idx ON chat_messages (is_read) WHERE is_read = false;

-- chat_attachments
CREATE TABLE IF NOT EXISTS chat_attachments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  file_url   text NOT NULL,
  file_name  text NOT NULL,
  file_type  text NOT NULL,
  file_size  integer NOT NULL
);

CREATE INDEX IF NOT EXISTS chat_attachments_message_idx ON chat_attachments (message_id);

-- chat_quick_replies (admin canned responses)
CREATE TABLE IF NOT EXISTS chat_quick_replies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shortcut   text NOT NULL UNIQUE,
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_quick_replies ENABLE ROW LEVEL SECURITY;

-- chat_sessions policies
CREATE POLICY "chat_sessions_user_own" ON chat_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "chat_sessions_admin_all" ON chat_sessions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- chat_messages policies
CREATE POLICY "chat_messages_user_own_session" ON chat_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM chat_sessions cs WHERE cs.id = session_id AND cs.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM chat_sessions cs WHERE cs.id = session_id AND cs.user_id = auth.uid())
    AND sender_id = auth.uid()
    AND sender_role = 'user'
  );

CREATE POLICY "chat_messages_admin_all" ON chat_messages
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- chat_attachments policies
CREATE POLICY "chat_attachments_user_own" ON chat_attachments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN chat_sessions cs ON cs.id = cm.session_id
      WHERE cm.id = message_id AND cs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN chat_sessions cs ON cs.id = cm.session_id
      WHERE cm.id = message_id AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_attachments_admin_all" ON chat_attachments
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- chat_quick_replies: admin only
CREATE POLICY "chat_quick_replies_admin_all" ON chat_quick_replies
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Trigger: update chat_sessions.updated_at on new message
CREATE OR REPLACE FUNCTION update_chat_session_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions SET updated_at = now() WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chat_messages_update_session
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_chat_session_on_message();

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Storage bucket (public for simplicity; RLS on table is the real guard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "chat_attachments_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "chat_attachments_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_sessions;
