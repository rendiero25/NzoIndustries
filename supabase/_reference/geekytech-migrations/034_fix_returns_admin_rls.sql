-- Fix: admin cannot see the return record or its shipments, so the entire
-- return-management UI silently disappears from the admin complaint detail
-- page once a return is approved.
--
-- `returns` and `return_shipments` each carry a single owner-scoped SELECT
-- policy with no admin bypass — the same gap migration 030 fixed for
-- complaint_messages. Because the admin complaint detail page reads through
-- the regular session-bound client, the nested `returns(...)` select is
-- RLS-filtered to null for every admin, which hides the ReturnManager card
-- (it is gated on `complaint.returns` being present).
--
-- User-facing writes stay blocked on purpose: server actions already verify
-- ownership and then write with the service role, so no UPDATE/INSERT policy
-- is granted to end users here.

DROP POLICY IF EXISTS "user_returns_read" ON returns;

CREATE POLICY "returns_read_own_or_admin" ON returns FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "user_return_shipments_read" ON return_shipments;

CREATE POLICY "return_shipments_read_own_or_admin" ON return_shipments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM returns r
      WHERE r.id = return_shipments.return_id
        AND (r.user_id = auth.uid() OR is_admin())
    )
  );
