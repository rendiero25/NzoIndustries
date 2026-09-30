-- Remove the retired customer/admin chat system and all chat data.

ALTER PUBLICATION supabase_realtime DROP TABLE chat_messages, chat_sessions;

DROP FUNCTION IF EXISTS public.toggle_chat_reaction(uuid, uuid, text);

DROP TABLE IF EXISTS public.chat_attachments;
DROP TABLE IF EXISTS public.chat_messages;
DROP TABLE IF EXISTS public.chat_sessions;
DROP TABLE IF EXISTS public.chat_quick_replies;

DROP FUNCTION IF EXISTS public.update_chat_session_on_message();

DELETE FROM public.notifications
WHERE type IN ('chat_message', 'chat_session_closed');

DELETE FROM public.admin_notifications
WHERE type IN ('chat_new_session', 'chat_message_user');

DROP POLICY IF EXISTS "chat_attachments_upload" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_read" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_admin_read" ON storage.objects;

DELETE FROM storage.objects WHERE bucket_id = 'chat-attachments';
DELETE FROM storage.buckets WHERE id = 'chat-attachments';
