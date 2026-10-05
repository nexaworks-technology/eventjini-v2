"use server";

import { ADMIN_ROLES, authorizeAction } from "@/lib/event-access";
import { UUID_RE } from "@/lib/registration";

export type DecisionResult = { ok: true } | { ok: false; error: string };

export async function decideApplication(eventId: string, applicationId: string, decision: "approved" | "rejected"): Promise<DecisionResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!UUID_RE.test(applicationId) || !["approved", "rejected"].includes(decision)) return { ok: false, error: "Invalid request." };

  const { data: row } = await auth.supabase.from("sponsor_registrations").select("event_id").eq("id", applicationId).maybeSingle();
  if (!row || row.event_id !== eventId) return { ok: false, error: "Application not found." };

  const { error } = await auth.supabase.rpc("decide_sponsor_application", { p_id: applicationId, p_decision: decision });
  if (error) {
    const m = error.message ?? "";
    if (m.includes("NOT_PENDING")) return { ok: false, error: "This application has already been reviewed." };
    if (m.includes("NOT_FOUND")) return { ok: false, error: "Application not found." };
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  return { ok: true };
}
