-- Fix: admin cannot see complaint_messages in the admin complaint detail page.
--
-- The only RLS policy on complaint_messages ("user_complaint_messages") only
-- allowed access when complaints.user_id = auth.uid(), with no admin bypass —
-- unlike every other "*_all_own" policy in 004_rls.sql (e.g. complaints_all_own
-- USING (auth.uid() = user_id OR is_admin())). Because the admin complaint
-- detail page reads via the regular session-bound client (not service role),
-- the nested complaint_messages select was silently RLS-filtered to empty for
-- every admin viewing a complaint they don't own.
--
-- This policy was applied out-of-band and was never captured in a migration
-- file, so this also documents it going forward.

DROP POLICY IF EXISTS "user_complaint_messages" ON complaint_messages;

CREATE POLICY "complaint_messages_all_own" ON complaint_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = complaint_messages.complaint_id
        AND (c.user_id = auth.uid() OR is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = complaint_messages.complaint_id
        AND (c.user_id = auth.uid() OR is_admin())
    )
  );
