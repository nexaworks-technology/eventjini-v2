# EventJini Build Log

## P0 — Project Scaffold + Authentication

Status: In progress (code complete; live Supabase/Google verification pending)

### Scope
- [x] Next.js + TypeScript scaffold
- [x] Tailwind configured
- [x] App Router configured
- [x] Supabase packages installed
- [ ] Environment variables configured (`.env.local` created with empty values; Supabase URL and publishable key still needed)
- [x] Browser Supabase client
- [x] Server Supabase client
- [x] Middleware Supabase client
- [x] Root session-refresh middleware
- [x] Email/password registration
- [x] Email/password login
- [ ] Google OAuth (code in place; Google provider must be enabled in Supabase and tested end-to-end)
- [x] OAuth callback route
- [x] Profiles table (SQL in `supabase/migrations/20261005000000_p0_profiles.sql`; not yet applied)
- [x] auth.users → profiles trigger (in the same migration; not yet applied)
- [x] Profiles RLS (in the same migration; not yet applied)
- [x] Protected dashboard
- [x] Sign out
- [x] Production build passes (verified with placeholder env values)

### Decisions
- Supabase handles authentication.
- @supabase/ssr handles SSR cookie/session integration.
- profiles.id maps directly to auth.users.id.
- Profile creation is database-triggered.
- P0 contains no organizations, events, roles, ticketing or todos.
- Route protection runs in both the root `middleware.ts` (via `utils/supabase/middleware.ts`) and the dashboard server component. Next.js 16 deprecates the `middleware` file name in favor of `proxy`; the file is kept as `middleware.ts` per the P0 brief and the build emits a deprecation warning.
- Missing `NEXT_PUBLIC_SUPABASE_*` variables throw a descriptive error at first use (`utils/supabase/env.ts`).

### Setup required before testing
1. Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
2. Run `supabase/migrations/20261005000000_p0_profiles.sql` in the Supabase SQL Editor.
3. Enable the Google provider in Supabase Auth and add `http://localhost:3000/auth/callback` to the allowed redirect URLs.

### Verification
- [ ] Email registration tested
- [ ] Email login tested
- [ ] Google login tested
- [ ] Profile trigger tested
- [ ] Dashboard protection tested
- [ ] Session survives page refresh
- [ ] Sign out tested
- [ ] Bad password shows an error and stays on /login

## P1 — Events Core

Status: In progress (code complete; migration applied; logged-in click-through verification pending)

Migration: `supabase/migrations/20261005010000_create_events.sql` (applied; anon insert and slug-function calls confirmed rejected).

### Database
- [x] event_status enum
- [x] events table migration
- [x] organizer ownership
- [x] timestamps (plus `updated_at` trigger)
- [x] field constraints (also a slug-format CHECK)
- [x] unique slug constraint
- [x] RLS enabled
- [x] own-event SELECT policy
- [x] own-event INSERT policy
- [x] own-event UPDATE policy
- [x] public published-event SELECT policy
- [x] `is_slug_available()` security-definer function (authenticated only) so availability sees other organizers' private drafts

### Organizer
- [x] Events list
- [x] Create event CTA
- [x] Basics step
- [x] Date & Time step
- [x] Settings step
- [x] Review step
- [x] Save draft
- [x] Publish
- [x] Event summary
- [x] Event editing

### Public
- [x] /e/[slug]
- [ ] Published events render (needs live test)
- [ ] Draft events return 404 (needs live test)
- [x] Responsive event page

### Slugs
- [x] Title → slug generation
- [x] Slug normalization
- [x] Availability check
- [x] Database uniqueness
- [x] Duplicate error state

### Decisions
- Server actions (`app/dashboard/events/actions.ts`) re-validate all input and set `organizer_id` from `auth.getUser()`; the browser never supplies it.
- Date/time are converted from the selected IANA timezone to UTC (`lib/time.ts`, no date library) and stored as `timestamptz` plus `timezone`; the edit form converts back.
- The public page filters on `status = 'published'` explicitly, so an organizer viewing their own draft slug also gets 404.
- Slug availability is visible to any signed-in user (it must be, to prevent collisions); it is not callable by anonymous visitors.
- No slug history/redirects: an old slug stops resolving after a change.
- No delete UI, so no DELETE policy.

### Verification
- [ ] Organizer can create event
- [ ] Organizer can edit own event
- [ ] Organizer cannot edit another user's event
- [ ] Draft is not publicly visible
- [ ] Published event is publicly visible
- [ ] Duplicate slug rejected
- [ ] Date/time persists correctly
- [x] Production build passes
- [x] Unit-checked slug normalization and timezone conversion (IST, EDT/EST, invalid date)
