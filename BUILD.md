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
