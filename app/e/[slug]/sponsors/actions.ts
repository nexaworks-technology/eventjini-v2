"use server";

import { UUID_RE } from "@/lib/registration";
import { createClient } from "@/utils/supabase/server";

export type ApplyInput = { tierId: string; companyName: string; contactName: string; contactEmail: string; message: string };
export type ApplyResult =
  | { ok: true; eventTitle: string; tierName: string }
  | { ok: false; error: string; field?: string };

const GENERIC = "We couldn't submit your application. Please try again.";

export async function submitSponsorApplication(eventId: string, input: ApplyInput): Promise<ApplyResult> {
  if (!UUID_RE.test(eventId) || !UUID_RE.test(input.tierId)) return { ok: false, error: "That sponsorship tier is no longer available." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_sponsor_application", {
    p_event_id: eventId,
    p_tier_id: input.tierId,
    p_company_name: input.companyName,
    p_contact_name: input.contactName,
    p_contact_email: input.contactEmail,
    p_message: input.message,
  });

  if (error) {
    const m = error.message ?? "";
    if (m.includes("INVALID_TIER")) return { ok: false, error: "That sponsorship tier is no longer available." };
    if (m.includes("EVENT_UNAVAILABLE")) return { ok: false, error: "Sponsorship applications are not open for this event." };
    if (m.includes("DUPLICATE_APPLICATION")) return { ok: false, error: "An application for this email address is already under review for this event." };
    if (m.includes("INVALID_INPUT:companyName")) return { ok: false, error: "Company name is required.", field: "companyName" };
    if (m.includes("INVALID_INPUT:contactName")) return { ok: false, error: "Contact name is required.", field: "contactName" };
    if (m.includes("INVALID_INPUT:contactEmail")) return { ok: false, error: "Enter a valid contact email.", field: "contactEmail" };
    if (m.includes("INVALID_INPUT:message")) return { ok: false, error: "The message is too long.", field: "message" };
    return { ok: false, error: GENERIC };
  }
  const d = data as { event_title: string; tier_name: string };
  return { ok: true, eventTitle: d.event_title, tierName: d.tier_name };
}
