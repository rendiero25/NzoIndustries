-- Enable Supabase Realtime broadcast for complaint_messages so the user and
-- admin complaint chat threads update live (no manual refresh). RLS from
-- migration 030 (complaint_messages_all_own) still governs who receives which
-- rows over the realtime channel — this only adds the table to the publication.
ALTER PUBLICATION supabase_realtime ADD TABLE complaint_messages;
