-- Admins may change a member's role, nothing else. The update policy only checks
-- that the row belongs to an event the caller administers, so without a column
-- grant an admin could repoint user_id, event_id or invited_by on any member row.
revoke update on public.event_members from anon, authenticated;
grant update (role) on public.event_members to authenticated;
