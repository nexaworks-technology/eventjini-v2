"use server";

import { UUID_RE } from "@/lib/registration";
import { createClient } from "@/utils/supabase/server";

export async function setLeadConsent(registrationId: string, enabled: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!UUID_RE.test(registrationId)) return { ok: false, error: "Ticket not found." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session has expired. Reload the page and try again." };
  const { error } = await supabase.rpc("set_sponsor_lead_consent", { p_registration_id: registrationId, p_enabled: enabled });
  if (error) return { ok: false, error: "Could not update your preference. Please try again." };
  return { ok: true };
}
