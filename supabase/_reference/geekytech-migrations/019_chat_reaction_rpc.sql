-- 019_chat_reaction_rpc.sql
-- Atomic JSONB reaction toggle for chat messages

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
  v_reactions jsonb;
  v_current   jsonb;
  v_user_text text;
  v_has_reacted boolean;
BEGIN
  -- Lock the row to prevent concurrent modification
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
    -- Remove user from this emoji's array
    v_reactions := jsonb_set(
      v_reactions,
      ARRAY[p_emoji],
      (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(v_current) AS elem
       WHERE elem <> to_jsonb(v_user_text))
    );
    -- Remove key entirely if array is now empty or null
    IF v_reactions -> p_emoji IS NULL OR v_reactions -> p_emoji = 'null'::jsonb OR jsonb_array_length(v_reactions -> p_emoji) = 0 THEN
      v_reactions := v_reactions - p_emoji;
    END IF;
  ELSE
    -- Add user to this emoji's array
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
