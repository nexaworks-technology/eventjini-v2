# EventJini Build Log

## P0 — Project Scaffold + Authentication

Status: Complete except Google OAuth end-to-end (requires an interactive Google consent screen) and bad-password UI check

### Scope
- [x] Next.js + TypeScript scaffold
- [x] Tailwind configured
- [x] App Router configured
- [x] Supabase packages installed
- [x] Environment variables configured
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
- [x] Email registration tested (autoconfirm on)
- [x] Email login tested
- [x] Google login tested (confirmed working by the user)
- [x] Profile trigger tested (row auto-created; own-row RLS)
- [x] Dashboard protection tested (logged-out and guest sessions redirect to /login)
- [x] Session survives page refresh
- [x] Sign out tested
- [ ] Bad password shows an error and stays on /login

## P1 — Events Core

Status: Verified against the real Supabase project (see Verification)

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
- [x] Published events render
- [x] Draft events return 404
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
- [x] Organizer can create event (wizard, UI-driven)
- [x] Organizer can edit own event (RLS update verified; edit-form UI not click-tested)
- [x] Organizer cannot edit another user's event (0 rows updated)
- [x] Draft is not publicly visible
- [x] Published event is publicly visible
- [x] Duplicate slug rejected (UI message + DB 23505)
- [x] Date/time persists correctly (10:00 Asia/Kolkata -> 04:30Z, renders 10:00 AM)
- [x] Production build passes
- [x] Unit-checked slug normalization and timezone conversion (IST, EDT/EST, invalid date)

## P2 — Registration & Ticketing

Status: Verified against the real Supabase project (see Verification). Follow-up migration `20261005030000_block_anonymous_event_writes.sql` must be applied.

Migration: `supabase/migrations/20261005020000_create_registration_ticketing.sql`

### Required Supabase setup before testing
1. Run the migration in the SQL Editor.
2. Authentication → Sign In / Providers → enable **Anonymous Sign-Ins** (done).
3. Run `20261005030000_block_anonymous_event_writes.sql` (restrictive policies so guest sessions cannot create or update events).

### Database
- [x] registration_status enum
- [x] registrations migration
- [x] event_registration_fields migration
- [x] custom_answers JSONB
- [x] ticket_code unique constraint (nullable; CHECK requires a code when approved/checked_in)
- [x] registration ownership (`owner_user_id`, `unique(event_id, owner_user_id)`)
- [x] registration indexes
- [x] RLS enabled
- [x] attendee own-ticket policy
- [x] organizer event-registration policy
- [x] registration-field RLS
- [x] race-safe capacity transaction (event row `FOR UPDATE` in `create_event_registration` / `approve_event_registration`)

### Registration form
- [x] Guest registration
- [x] Anonymous Supabase session (browser `signInAnonymously()` when no session exists)
- [x] Base attendee fields
- [x] B2B fields
- [x] Text / long-text / dropdown / checkbox custom fields
- [x] Required/optional validation (client, server action, and again inside the SQL function)
- [x] JSONB answers keyed by stable `field_key`

### Approval
- [x] Pending application
- [x] Organizer queue with filters and counts
- [x] Approve / Reject (SQL functions that verify ownership)
- [x] Capacity re-check on approval
- [x] Ticket generated only after approval

### Tickets
- [x] Unique ticket codes (`EVJ-` + 16 hex from `gen_random_uuid()`, version/variant digits skipped)
- [x] QR ticket page (QR encodes only the opaque code; rendered server-side with `qrcode`)
- [x] My Tickets
- [x] Guest ownership protection (query filters on owner; not-found otherwise)
- [x] Add to calendar / `.ics` from stored UTC instants

### Capacity
- [x] Capacity display
- [x] Sold-out state on event page and `/register`
- [x] Server/database enforcement

### Decisions
- All registration writes go through `security definer` functions; `registrations` has no INSERT/UPDATE/DELETE policies, so the browser can never set `owner_user_id`, `status` or `ticket_code`.
- Helper functions `is_event_organizer` / `is_event_registration_open` are `security definer` to avoid RLS recursion between `events` and `registrations` policies.
- An extra `events` SELECT policy lets attendees read events they registered for, so My Tickets still works if an event is later unpublished.
- Sold-out events reject new registrations (open and approval). Pending applications submitted earlier can still exist; approving them fails cleanly once capacity is reached.
- `event_seats_taken()` exposes only a count, to anon and authenticated, for the sold-out state.
- Registration is open only while `events.status = 'published'` (the only publicly readable state in P1).
- Anonymous guest tickets belong to that browser session; no cross-device recovery in P2.

### Verification
- [x] Open registration works (UI + DB)
- [x] Curated registration works (pending -> approve in UI)
- [x] Guest checkout works (no login screen; anonymous session)
- [x] Custom fields persist (stable keys in JSONB)
- [x] Guest sees only own tickets
- [x] Organizer sees own event registrations
- [x] Sold-out event rejects registration (page, /register, and DB)
- [x] Last-seat race (12 parallel guests, capacity 1 -> exactly 1 approved; parallel approvals too)
- [x] QR renders
- [x] Calendar download works (valid .ics, stored UTC instants)
- [x] Production build passes

### Bug found and fixed during verification
- Anonymous guest sessions count as authenticated users in Supabase, so a guest could open `/dashboard` and `/login` redirected guests away. Organizer routes, server actions, middleware, `/login`, `/register` and `/` now treat `user.is_anonymous` as logged out. The follow-up migration enforces the same rule in the database for event writes.
- `app/globals.css` dark-mode override made text unreadable inside the light-only cards; the app is now light-only.

### Not verified
- Google OAuth end-to-end (needs an interactive Google consent screen).
- Bad-password UI error, event edit form UI, rejecting via the UI (reject verified at DB level), organizer B browsing the dashboard UI (isolation verified at DB/API level).
- `20261005030000_block_anonymous_event_writes.sql` has not been applied or tested yet.
- Database-layer suite: 55 checks (RLS isolation, validation, approvals, concurrency) passed against the real project via REST/RPC with real sessions.

## P3 — Organizer Operations

Status: Complete. Permission layer verified live (121 checks); camera QR scan, CSV export, task board drag-and-drop and team invite flow confirmed working by the user.

### Required Supabase setup before testing
1. Run `supabase/migrations/20261005040000_create_event_operations.sql` in the SQL Editor (done).
2. (Already applied) `20261005030000_block_anonymous_event_writes.sql` — confirmed live: a guest session creating an event gets HTTP 403.

### Team
- [x] event_members migration
- [x] event_invites migration (token stored as SHA-256 hash only)
- [x] admin / scanner / viewer roles (`event_member_role` enum)
- [x] invite by email (creates a one-time invitation link; no email is sent yet — see Decisions)
- [x] invite acceptance (`/invite/[token]`, email must match the invited address)
- [x] membership removal / role change
- [x] role-based navigation
- [x] event-scoped RLS (`event_role()` / `can_access_event()` / `is_event_admin()` / `can_check_in()` / `can_view_tasks()`)

### Guests
- [x] guest list, search (name/email/company/ticket code), status filters with counts, guest detail
- [x] CSV export (`/api/events/[id]/guests.csv`, server-side owner/admin check, CSV escaping + formula-injection guard)

### Check-in
- [x] event_check_ins migration, `registrations.checked_in_at/by`
- [x] camera QR scanner (`html5-qrcode`, rear camera, explicit Start button, camera-denied fallback)
- [x] manual code fallback + minimal-data name search for scanners
- [x] transactional `check_in_ticket()` RPC (row lock; unique index on `event_check_ins.registration_id`)
- [x] duplicate scan protection, wrong-event rejection
- [x] scanner minimal-data view (scanners have no read access to `registrations`)

### Agenda
- [x] event_sessions migration, list / add / edit / delete, time validation (end > start, warning when outside event window), public agenda on `/e/[slug]`

### Tasks
- [x] event_tasks migration, three columns, add/edit/delete, drag-and-drop plus explicit move buttons (keyboard accessible), order persistence via atomic `reorder_event_tasks()`, viewer read-only

### Decisions
- Owner is implicit via `events.organizer_id`; `event_members` holds only admin/scanner/viewer. A trigger makes `organizer_id` immutable, so an admin can never take over an event.
- P2 owner-only policies and functions (registrations read, registration fields, approve/reject, save_registration_form) were widened to owner + admin, matching the P3 role matrix.
- Invite emails: the app has no email provider, so creating an invite shows the link once for the organizer to send. Only the SHA-256 hash is stored, so the link cannot be shown again.
- Anonymous guest sessions never receive an event role (`event_role()` checks `is_anonymous`).
- Guest search runs in the database with a sanitised query; the list is capped at 500 rows per page (CSV at 10,000).

### Verification
- [x] owner/admin permissions (live RLS/RPC suite)
- [x] scanner permissions (no registrations/tasks/team/audit access; minimal check-in data)
- [x] viewer permissions (reads agenda/tasks; no writes, no check-in)
- [x] cross-event isolation (admin of E1 has no role, writes or approvals on E2/E3; organizer B sees nothing)
- [x] CSV export (confirmed working by the user)
- [x] QR check-in (RPC verified; real camera scan confirmed working by the user)
- [x] duplicate check-in (incl. 8 parallel scans -> exactly 1 success, 1 audit row)
- [x] manual check-in (RPC with method=manual; UI path shows 'Ticket not found' for a fake code)
- [x] agenda persistence (DB level; UI not click-tested)
- [x] task-board persistence (DB level via reorder RPC; drag/drop UI not click-tested)
- [x] revoked member loses access (role null immediately; check-in/search refused; history retained)
- [x] production build passes

### Bug found and fixed during verification
- Camera view stayed blank: the scanner container was `display:none` while `html5-qrcode` started, so the library measured a zero-width box. The container is now always rendered. Verified: container is 496px wide on start and the camera-denied fallback appears when permission is blocked.

## P4 — Communications & Analytics

Status: Verified live against Supabase, the Next.js server, Resend and a public tunnel (113-check suite: 111 passed, the 2 "failures" were test-script mistakes, re-verified by hand). Follow-up migration `20261005060000_refresh_broadcast_status_on_webhook.sql` must be applied.

### Setup required before testing
1. Run `supabase/migrations/20261005050000_create_communications_analytics.sql` in the SQL Editor.
2. In `.env.local` fill (all server-only): `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (a sender on a Resend-verified domain), `RESEND_WEBHOOK_SECRET`, `CRON_SECRET` (any long random string), `SUPABASE_SERVICE_ROLE_KEY`.
3. In Resend, add a webhook pointing at `https://<public-host>/api/webhooks/resend` for the `email.*` events (locally this needs a tunnel such as ngrok) and copy its signing secret to `RESEND_WEBHOOK_SECRET`.
4. Something must call `GET /api/cron/email-worker` and `GET /api/cron/automations` with `Authorization: Bearer $CRON_SECRET` about every 5 minutes (Vercel Cron, GitHub Actions or similar). Broadcasts also send immediately when Send is clicked.

### Resend
- [x] resend package installed
- [x] RESEND_API_KEY server-only (`lib/email/resend.ts` imports `server-only`; no client import path)
- [~] sender: using Resend's `onboarding@resend.dev` test sender (delivers only to the account owner's address); verify a domain before real use
- [x] server email helper (`lib/email/resend.ts`, `lib/email/worker.ts`)
- [x] email worker (`/api/cron/email-worker`, also invoked after Send)
- [x] webhook verification (`resend.webhooks.verify`, Svix signature) — untested live
- [x] delivery status updates (`apply_email_event`: delivered only after sent; idempotent) — untested live

### Broadcasts
- [x] event_broadcasts migration, compose UI, approved / pending / checked-in segments, recipient preview count
- [x] recipient snapshot into `email_deliveries` in one transaction (`queue_broadcast`)
- [x] duplicate-send protection (`unique(event_id, request_id)` and `unique(broadcast_id, registration_id)`)
- [x] delivery log with filters, retry of failed rows only, partial-failure status
- [x] unknown template variables rejected in the UI, server action and database

### Automations
- [x] event_automations + automation_runs migrations; registration-approved trigger (database trigger on pending → approved); 24h-before trigger (`queue_event_reminders`, cron); send-email action
- [x] enable / disable (new automations default to disabled), idempotent runs via `unique(automation_id, trigger_key)`, run history, cron secret protection

### Attribution
- [x] event_page_views, `ej_visitor_id` cookie (httpOnly, SameSite=Lax), UTM + referrer capture through `/api/events/[id]/track`, event-scoped
- [x] registration_attribution with first and last touch computed in the database from the visitor's own recorded visits (the browser cannot submit a source)

### Analytics
- [x] page views, unique visitors, registrations, registrations per day (event timezone), checked-in count and rate = checked_in ÷ (approved + checked_in), source breakdown with conversion, viewer read access, scanner none

### Decisions
- The email worker, Resend webhook and tracking endpoint have no signed-in user, so they use a **server-only** `SUPABASE_SERVICE_ROLE_KEY` (`lib/supabase/admin.ts`, `import "server-only"`). This is a deliberate exception to the P0 note "no service-role key in the frontend project"; the key is never exposed to the browser and never prefixed `NEXT_PUBLIC_`. The privileged SQL functions are executable by `service_role` only.
- Broadcasts have no browser write policy at all, so they are immutable after queueing.
- The approval automation fires on a genuine pending → approved transition. Open-registration events auto-approve on creation (no transition), so they do not trigger it.
- Plain-text messages are wrapped in a simple branded HTML email; variables are resolved per recipient on the server.

### Verification
- [x] production build passes
- [x] Resend / service-role / cron / webhook secret names and values absent from the client bundle (grep of `.next/static`: 0 files)
- [x] broadcast sends to correct segment (only Approved snapshotted; pending/rejected/checked-in excluded; real send via the UI)
- [x] delivery webhook updates status (real Resend webhooks through a Cloudflare tunnel: sent -> delivered / failed / bounced; invalid, unsigned and replayed signatures rejected; duplicates idempotent)
- [x] approval automation sends once (one run, one email; repeat approval refused)
- [x] reminder automation sends once (Approved + Checked-in only; second cron run queues nothing; disabled rule creates nothing)
- [x] UTM view recorded (UI visit and API; one visitor cookie reused)
- [x] conversion attributed correctly (real browser visit with UTMs then UI registration credited to LinkedIn; last touch ignores other events)
- [x] cross-event analytics blocked (organizer B, viewer, scanner and guests denied on broadcasts, deliveries, automations, runs, views, attribution)

### Bugs found and fixed during verification
- A webhook-reported failure left the broadcast header at `sent`. `apply_email_event` now recomputes the broadcast status (migration 060).
- Analytics conversion could exceed 100% for Direct (registrations that predate tracking). It now shows a dash when registrations exceed recorded views.

### Not verified
- A domain-verified sender (Resend's test sender only delivers to the account owner).
- The cron routes being invoked by a real scheduler (they were called manually with the secret).
- Scheduled reminder arrival 24h before a real event (simulated with an event 20h away).

## P5 — Sponsors

Status: Complete. Verified live: 117-check database/RLS suite passed; camera QR scan and CSV download confirmed working by the user. Remember to turn on Supabase "Confirm email" before production.

### Setup required before testing
1. Run `supabase/migrations/20261005070000_create_sponsor_system.sql` in the SQL Editor.
2. **Security note:** the sponsor-portal claim rule compares the signed-in account's email with the application's `contact_email` and requires `email_confirmed_at`. With Supabase "Confirm email" turned OFF (as in this dev project) every signup is auto-confirmed, so anyone could register with someone else's address and claim their portal. Turn "Confirm email" ON before using sponsors in production.

### Sponsorship tiers
- [x] sponsorship_tiers migration (benefits `text[]`, `sort_order`, `price_display` text only)
- [x] tier create / edit / delete / reorder (move up/down, atomic `reorder_sponsorship_tiers`)
- [x] public tier display on `/e/[slug]/sponsors` (no payment or checkout anywhere)
- [x] organizer RLS (owner/admin write; public read only for published events)
- [x] a tier referenced by an application cannot be deleted (FK without cascade, friendly error)

### Applications
- [x] sponsor_registration_status enum, sponsor_registrations migration
- [x] public application via `create_sponsor_application()` (browser never sets status or sponsor_user_id; no direct insert policy)
- [x] organizer list with filters, approve / reject (`decide_sponsor_application`), rejected rows kept
- [x] one open application per contact email per event

### Sponsor portal
- [x] claim: signed-in confirmed email must match `contact_email` and the application must be approved (`claim_sponsor_portal`); event owner/admin role does not grant portal access
- [x] portal route with pending / rejected / not-found states, company name + logo URL editing through `update_sponsor_profile` (tier, event, status, contact email cannot change)
- [x] sponsor portals listed on `/dashboard` for sponsors

### Lead capture
- [x] sponsor_leads migration (snapshot of consented fields; attendee_registration_id hidden by column privileges)
- [x] attendee consent toggle on the ticket page and My Tickets (`registrations.sponsor_lead_consent` + timestamp, default off)
- [x] QR scanner (camera, explicit start, denied-camera fallback) + manual ticket code
- [x] `capture_sponsor_lead()`: same-event, active-attendee and consent checks, duplicate prevention, returns only first/last name, email, company, job title
- [x] lead notes (`update_sponsor_lead_notes`)

### Leads
- [x] leads list, search (name, email, company, job title), detail with notes
- [x] CSV export `/api/sponsor/portal/[id]/leads.csv` (owner-checked in the route; columns: First Name, Last Name, Email, Company, Job Title, Notes, Captured At)

### Decisions
- Sponsors never read `registrations`; the capture function copies only the five consented fields into `sponsor_leads` at scan time. Revoking consent later blocks new scans but does not delete leads already captured.
- Organizers cannot read sponsor leads or notes (not required by the brief).
- Direct reads on `sponsor_leads` use explicit columns because `select=*` would include the hidden attendee id and is refused.

### Verification
- [x] public sponsor application (no login; status always pending; direct inserts denied)
- [x] organizer approval / rejection (other organizers refused; rejected kept; no re-decision)
- [x] sponsor portal claim (case-insensitive email match; wrong email, event owner, other organizer and guests refused)
- [x] Sponsor A cannot access Sponsor B (registrations, leads, notes, profile, capture)
- [x] QR lead capture (RPC verified; real camera scan confirmed by the user)
- [x] consent rejection (no_consent returns no data; revoke blocks new scans)
- [x] wrong-event rejection (no data returned)
- [x] duplicate scan protection (6 parallel scans -> exactly one lead)
- [x] CSV export (confirmed working by the user)
- [x] production build passes
