-- Anonymous guest sessions are `authenticated` in Postgres. They may register for
-- events but must never create or modify events themselves.

create policy "Anonymous guests cannot create events"
on public.events
as restrictive
for insert
to authenticated
with check (
  coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);

create policy "Anonymous guests cannot update events"
on public.events
as restrictive
for update
to authenticated
using (
  coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);
