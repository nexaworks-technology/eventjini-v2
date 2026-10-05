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

## P6 — Operations Polish & Final Phase

Status: Complete except two checks that need a real phone (PWA install and standalone camera scan). Verified live: 102-check P6 database/storage suite, UI click-through, mobile overflow audit of 28 pages, accessibility scan, service-worker simulation, and the P1–P5 regression suites.

### Setup required before testing
1. Run `supabase/migrations/20261005080000_create_budget_vendors_branding.sql` in the SQL Editor. It also creates the public-read `event-assets` Storage bucket (5 MB, JPEG/PNG/WebP only) and its write policies.

### Budget
- [x] event_budget_items migration; budget list grouped by category; estimated, actual and variance (actual − estimated) per item, category and event, computed in integer cents; one event-level currency (default INR); read-only for viewers, no access for scanners; event-scoped RLS

### Vendors
- [x] event_vendors migration; create / edit / delete; search by name; category and status filters; statuses prospect / confirmed / completed / cancelled only; event-scoped RLS

### Event settings
- [x] settings page (details, date & location, registration settings, branding, cover, danger zone); slug uniqueness and date validation reuse the P1 rules; primary and accent colors validated as `#RRGGBB` (database CHECK) with live preview and automatic readable text color; branding applied to `/e/[slug]`, `/e/[slug]/register`, `/e/[slug]/sponsors` only
- [x] Supabase Storage cover upload / replace / remove: public-read bucket, writes only by event owner/admin under `events/<event-id>/cover/<uuid>.<ext>`, enforced by a storage policy; client and bucket-level type and size limits; the previous object is deleted on replace
- [x] danger zone: Unpublish (reversible); deleting an event is not offered

### Next.js 16
- [x] `middleware.ts` → `proxy.ts` (export renamed `proxy`), `utils/supabase/middleware.ts` → `utils/supabase/proxy.ts`, session refresh and matcher preserved; matcher also skips the service worker, manifest and icons. Authorization stays in RLS and server actions, not in the proxy.

### PWA
- [x] manifest (standalone, start_url `/dashboard`), 192 / 512 / maskable / Apple icons, service worker registered in production only, offline page, install button (browser install prompt, iOS "Add to Home Screen" hint)
- [x] service worker caches only `/_next/static/*`, `/icons/*` and `/offline.html`. It never intercepts pages, `/api/*`, Supabase or any other origin, so guest lists, tickets, leads and logs are never cached.
- [x] scanners show "You're offline. Reconnect to validate tickets." and refuse to validate while offline. This is installable + online scanning, not offline check-in.

### UI polish
- [x] shared UI primitives (`components/ui.tsx`: buttons, inputs, status badges, empty states), global visible keyboard focus ring, status badges with text on the main lists, explicit confirmations on destructive actions, empty states on budget and vendors

### Decisions
- Variance is never stored; it is always computed as actual − estimated (positive = over budget).
- Public-read bucket is for event covers only. Private attendee or sponsor files must go in a separate private bucket.
- Cover images are decorative (`alt=""`); event identity always comes from the heading.

### Verification
- [x] production build passes, no middleware/proxy deprecation warning
- [x] budget: UI create / negative-cost rejection / variance (+₹20,000 over, −₹10,000 under, event total +₹10,000) / reload persistence; DB: RLS for owner, admin, viewer (read-only), scanner, other organizer, guest
- [x] vendors: UI create / edit status / reload / filter; DB: RLS and validation (negative cost, blank name, payment-style statuses refused)
- [x] settings: details save and persist, taken slug refused, end-before-start refused, colors saved, branding visible on `/e/[slug]`, `/register` and `/sponsors` for a logged-out visitor
- [x] cover: upload through Storage under `events/<event-id>/cover/`, replace deletes the old object (verified by listing the folder), unsupported type and over-5 MB refused in the UI and at the bucket, non-owners / other events / root / traversal / HTML / SVG uploads refused by the storage policy
- [x] proxy: no `middleware.ts`; logged-out dashboard and budget URLs redirect; public 404 intact; authorization still enforced by RLS and server actions
- [x] PWA: manifest (standalone), icons, `sw.js` served with `max-age=0`; service-worker logic exercised in a Node harness: only static assets and the offline page are cached, `/api`, POSTs, Supabase calls, RSC data and every dashboard/ticket/lead URL are never cached
- [x] mobile 375px: no horizontal overflow on 28 organizer and public pages; accessibility scan of public and key organizer pages: labelled inputs, named buttons, single `h1`, `lang` set
- [x] regression suites against the P6 schema: P1/P2 55/55, P3 121/121, P4 111/113 (two known test-script mistakes, behavior verified by hand), P5 117/117
- [ ] PWA install on a phone (needs a real device)
- [ ] scanner camera in the installed standalone PWA (needs a real device)
- [ ] service worker running in a real browser (the embedded preview pane refuses service-worker registration; logic was verified by simulation)

### Bugs found and fixed during P6 verification
- Accent text color was chosen by a luminance threshold, giving white on orange `#F97316` (2.8:1, fails WCAG AA). It now picks black or white by actual contrast ratio (6.7:1), and Settings warns when a primary color is too faint on white.
- Several inputs had only a placeholder and no accessible name (guest search, add task, scanner ticket code and name search, agenda, tiers, automations, registration questions). They now have `aria-label`s. Nav pills are taller on phones.
- Test harness note: Supabase rate-limits sign-ups to roughly 30 per 5 minutes per IP, so the guest-creating suites must be run one at a time.

## P7 — Design System & Marketing Home

Status: In progress (usage limit reached mid-verification). No schema, RLS, RPC, server action, route or validation changes.

### Done (type-check, lint and production build pass)
- [x] shadcn/ui (base-nova, Base UI primitives) with only the needed components; `next-themes` light/dark/system with persistence; indigo EventJini primary; Geist typography; one `--radius` system
- [x] EventJini app tokens vs per-event tokens (`--event-primary/accent` + contrast-computed foregrounds) kept separate
- [x] Dashboard shell: sidebar, sticky header, account menu (theme + sign out), mobile Sheet; event workspace with grouped, role-filtered navigation (Event / Operations / Growth / Manage)
- [x] Shared components: PageHeader, StatusBadge, EmptyState, MetricCard, FormSection, FieldError/FormMessage, DataTableShell, filter pills, AlertDialog-based confirmations (replaced every `window.confirm`), Toaster
- [x] Rebuilt: event overview, public event page, register page + form (three sections, one error pattern), ticket page (QR always black-on-white), My Tickets, sponsor public page, sponsor portal (distinct header), auth pages, invite page, events list, dashboard home, guests / delivery log / team tables
- [x] All hard-coded zinc/red/green/amber colours swept to semantic tokens; legacy `components/ui.tsx` and old event nav removed
- [x] Marketing home `/` (header + mobile sheet, hero, features, how it works, sample-data previews, marked testimonial placeholders, free-pilot pricing, CTA, footer)
- [x] Automated WCAG contrast check: home + 12 dashboard pages + public pages in dark mode, 0 failures (one real issue found and fixed in the branding preview)
- [x] Verified: theme persists, sign-out works, logged-out `/dashboard` redirects, registration empty-submit validation

### Not yet verified
- Full guest registration → ticket → check-in flow in the new UI; scanner-role navigation; mobile shell Sheet; light-mode contrast sweep; keyboard pass on dialogs; P3/P4/P5 regression suites re-run (backend untouched, but not re-run)

## Email templates (post-P7)

- `lib/email/layout.ts`: branded, table-based HTML (event colour, cover image, When/Where panel, CTA button, footer) used by the worker and the live preview.
- `lib/email/templates.ts`: 7 starter templates (approval, 24h reminder, event day, announcement, schedule change, last call, thank you), picked from a dropdown in Communications and Automations.
- Migration `20261005090000_email_branding_context.sql` adds slug/colour/cover to `claim_email_deliveries` (must be applied; emails still send without it, just unbranded).
- Verified: preview renders in the composer. Not yet verified: real inbox rendering (Gmail/Outlook/Apple Mail), sending from a verified domain.

## Unsubscribe (post-P7)

- Migration `20261005100000_email_unsubscribe.sql`: `registration_email_prefs` (token + opt-out, RLS on, no policies), trigger + backfill, `unsubscribe_preview` / `set_email_opt_out` (anon-callable by unguessable token), broadcasts and recipient counts skip opted-out registrations, claim function returns `is_broadcast` + token.
- `/unsubscribe/[token]` (confirm button, resubscribe), `POST /api/unsubscribe/[token]` (RFC 8058 one-click). GET never changes state.
- Broadcast emails get a footer link, a plain-text link, and `List-Unsubscribe` + `List-Unsubscribe-Post` headers. Approval/reminder automations are transactional and unaffected.
- Verified: typecheck/lint, composer preview. NOT verified end to end until the migration is applied: opt-out, exclusion from a broadcast, resubscribe, one-click POST, headers arriving in a real inbox.

## Marketing home redesign (post-P7)

- `app/page.tsx` rebuilt to the supplied mockup: hero + dashboard mock, organizer pain points, registration / check-in / sponsor feature rows, 3-step how-it-works, dark pilot band, FAQ, slim footer. Nav: Product, Pilot program, FAQ.
- Orange brand is scoped to a `.landing` wrapper in globals.css; the app and event pages keep their own themes. Product visuals are markup-built mocks with sample data (no stock photos).
- FAQ copy matches current behaviour (scanner needs a connection; custom fields; data ownership).
- Verified: desktop and 375px render, no horizontal overflow. Not verified: dark mode on the landing, full keyboard/contrast pass.

## One orange theme (post-P7)

- App-wide tokens in globals.css are now the orange brand (light + dark); the `.landing` override is gone. Same orange in PWA `theme_color`, offline page, icons/favicon, brand mark, and as the default for events and emails with no custom colour (`DEFAULT_PRIMARY` = #C2410C).
- Event-specific brand colours still apply only on public event pages and in that event's emails.
- Verified: light and dark rendering of home, dashboard overview, analytics and sponsors. Chart palette is now orange + warm neutrals + amber/clay (no blue/cyan/magenta). Not re-checked: every remaining page, a formal contrast audit.
