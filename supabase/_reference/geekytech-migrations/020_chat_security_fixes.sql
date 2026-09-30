-- 020_chat_security_fixes.sql
-- Security and realtime fixes for chat system

-- Fix: REPLICA IDENTITY FULL so realtime UPDATE filters work correctly
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER TABLE chat_sessions REPLICA IDENTITY FULL;

-- Fix: Grant execute on toggle_chat_reaction to authenticated users
GRANT EXECUTE ON FUNCTION toggle_chat_reaction(uuid, uuid, text) TO authenticated;

-- Fix: Admin storage read policy (allow admin to read any chat attachment)
CREATE POLICY "chat_attachments_admin_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Fix: Add ownership check inside toggle_chat_reaction
-- Drop and recreate with access control
DROP FUNCTION IF EXISTS toggle_chat_reaction(uuid, uuid, text);

CREATE OR REPLACE FUNCTION toggle_chat_reaction(
  p_message_id uuid,
  p_user_id    uuid,
  p_emoji      text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reactions   jsonb;
  v_current     jsonb;
  v_user_text   text;
  v_has_reacted boolean;
  v_user_role   text;
BEGIN
  -- Verify caller's role (p_user_id must be the calling user — enforced by API layer)
  SELECT role INTO v_user_role FROM profiles WHERE id = p_user_id;

  -- Check access: user must own the session OR be admin
  IF NOT EXISTS (
    SELECT 1 FROM chat_messages cm
    JOIN chat_sessions cs ON cs.id = cm.session_id
    WHERE cm.id = p_message_id
      AND (cs.user_id = p_user_id OR v_user_role = 'admin')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Lock the row atomically
  SELECT reactions INTO v_reactions
  FROM chat_messages
  WHERE id = p_message_id
  FOR UPDATE;

  IF v_reactions IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  v_user_text   := p_user_id::text;
  v_current     := COALESCE(v_reactions -> p_emoji, '[]'::jsonb);
  v_has_reacted := v_current @> to_jsonb(v_user_text);

  IF v_has_reacted THEN
    v_reactions := jsonb_set(
      v_reactions,
      ARRAY[p_emoji],
      (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(v_current) AS elem
       WHERE elem <> to_jsonb(v_user_text))
    );
    IF v_reactions -> p_emoji IS NULL OR v_reactions -> p_emoji = 'null'::jsonb
       OR jsonb_array_length(v_reactions -> p_emoji) = 0 THEN
      v_reactions := v_reactions - p_emoji;
    END IF;
  ELSE
    v_reactions := jsonb_set(
      v_reactions,
      ARRAY[p_emoji],
      v_current || to_jsonb(v_user_text)
    );
  END IF;

  UPDATE chat_messages SET reactions = v_reactions WHERE id = p_message_id;
  RETURN v_reactions;
END;
$$;
