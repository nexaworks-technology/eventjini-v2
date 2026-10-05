"use server";

import { redirect } from "next/navigation";
import { UUID_RE } from "@/lib/registration";
import { createClient } from "@/utils/supabase/server";

export type Plain = { ok: true } | { ok: false; error: string };

export type CaptureOutcome =
  | {
      result: "captured" | "already_captured";
      lead: { id: string; first_name: string; last_name: string; email: string; company_name: string | null; job_title: string | null; notes: string | null; captured_at: string };
    }
  | { result: "not_found" | "wrong_event" | "not_active" | "no_consent" | "unauthorized" | "error" };

async function session() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return null;
  return supabase;
}

export async function claimSponsorPortal(id: string): Promise<Plain> {
  const supabase = await session();
  if (!supabase) return { ok: false, error: "Please sign in to claim this portal." };
  if (!UUID_RE.test(id)) return { ok: false, error: "Sponsor portal not found." };
  const { error } = await supabase.rpc("claim_sponsor_portal", { p_id: id });
  if (error) {
    if (error.message.includes("NOT_APPROVED")) return { ok: false, error: "This sponsorship application has not been approved yet." };
    return { ok: false, error: "Sponsor portal not found." };
  }
  redirect(`/dashboard/sponsor/portal/${id}`);
}

export async function updateSponsorProfile(id: string, companyName: string, logoUrl: string): Promise<Plain> {
  const supabase = await session();
  if (!supabase) return { ok: false, error: "Your session has expired. Please sign in again." };
  if (!UUID_RE.test(id)) return { ok: false, error: "Sponsor portal not found." };
  const { error } = await supabase.rpc("update_sponsor_profile", { p_sponsor_id: id, p_company_name: companyName, p_logo_url: logoUrl });
  if (error) {
    const m = error.message ?? "";
    if (m.includes("companyName")) return { ok: false, error: "Company name is required (200 characters max)." };
    if (m.includes("logoUrl")) return { ok: false, error: "Enter a valid http(s) image URL for the logo." };
    if (m.includes("NOT_FOUND")) return { ok: false, error: "Sponsor portal not found." };
    return { ok: false, error: "Could not save your profile. Please try again." };
  }
  return { ok: true };
}

const CODE_IN_TEXT = /EVJ-[0-9A-Fa-f]{16}/;

export async function captureLead(sponsorId: string, rawCode: string): Promise<CaptureOutcome> {
  const supabase = await session();
  if (!supabase || !UUID_RE.test(sponsorId)) return { result: "unauthorized" };
  const trimmed = rawCode.trim().slice(0, 200);
  const code = (CODE_IN_TEXT.exec(trimmed)?.[0] ?? trimmed).toUpperCase();

  const { data, error } = await supabase.rpc("capture_sponsor_lead", { p_sponsor_id: sponsorId, p_ticket_code: code });
  if (error || !data) return { result: "error" };
  const d = data as { result: string; lead?: CaptureOutcome extends { lead: infer L } ? L : never };
  if ((d.result === "captured" || d.result === "already_captured") && d.lead) return { result: d.result, lead: d.lead };
  if (["not_found", "wrong_event", "not_active", "no_consent", "unauthorized"].includes(d.result)) return { result: d.result as "not_found" };
  return { result: "error" };
}

export async function saveLeadNotes(sponsorId: string, leadId: string, notes: string): Promise<Plain> {
  const supabase = await session();
  if (!supabase) return { ok: false, error: "Your session has expired. Please sign in again." };
  if (!UUID_RE.test(sponsorId) || !UUID_RE.test(leadId)) return { ok: false, error: "Lead not found." };
  const { error } = await supabase.rpc("update_sponsor_lead_notes", { p_lead_id: leadId, p_notes: notes });
  if (error) return { ok: false, error: error.message.includes("notes") ? "Notes are too long." : "Could not save notes." };
  return { ok: true };
}
