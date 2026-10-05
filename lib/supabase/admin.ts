import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Privileged client for server-only jobs (email worker, webhook, tracking). Never import from a Client Component. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY. Set it in .env.local (server-only; never prefix it with NEXT_PUBLIC_).");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
