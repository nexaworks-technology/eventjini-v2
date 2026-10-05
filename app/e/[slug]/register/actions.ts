"use server";

import {
  normalizeSpaces,
  UUID_RE,
  validateRegistration,
  type RegistrationField,
  type RegistrationStatus,
  type RegistrationValues,
} from "@/lib/registration";
import { createClient } from "@/utils/supabase/server";

export type SubmitResult =
  | { ok: true; status: RegistrationStatus; ticketCode: string | null }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; code?: string };

const GENERIC = "We couldn't complete your registration. Your registration was not created. Please try again.";

export async function submitRegistration(
  eventId: string,
  values: RegistrationValues
): Promise<SubmitResult> {
  if (!UUID_RE.test(eventId)) return { ok: false, error: GENERIC };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Your guest session could not be started. Please reload and try again.", code: "NO_SESSION" };
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, status, require_b2b_data")
    .eq("id", eventId)
    .maybeSingle();
  if (!event || event.status !== "published") {
    return { ok: false, error: "Registration is not open for this event.", code: "CLOSED" };
  }

  const { data: fieldRows } = await supabase
    .from("event_registration_fields")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");
  const fields = (fieldRows ?? []) as RegistrationField[];

  const fieldErrors = validateRegistration(values, fields, event.require_b2b_data);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const { data, error } = await supabase.rpc("create_event_registration", {
    p_event_id: eventId,
    p_first_name: normalizeSpaces(values.firstName),
    p_last_name: normalizeSpaces(values.lastName),
    p_email: values.email.trim(),
    p_phone: normalizeSpaces(values.phone) || null,
    p_company_name: normalizeSpaces(values.companyName) || null,
    p_job_title: normalizeSpaces(values.jobTitle) || null,
    p_custom_answers: values.answers,
  });

  if (error) {
    const m = error.message ?? "";
    if (m.includes("SOLD_OUT")) return { ok: false, error: "Sorry, this event just sold out.", code: "SOLD_OUT" };
    if (m.includes("ALREADY_REGISTERED"))
      return { ok: false, error: "You're already registered for this event.", code: "ALREADY_REGISTERED" };
    if (m.includes("REGISTRATION_CLOSED"))
      return { ok: false, error: "Registration is not open for this event.", code: "CLOSED" };
    if (m.includes("NOT_AUTHENTICATED"))
      return { ok: false, error: "Your guest session expired. Please reload and try again.", code: "NO_SESSION" };
    if (m.includes("FIELD_INVALID") || m.includes("INVALID_INPUT"))
      return { ok: false, error: "Please check your answers and try again." };
    return { ok: false, error: GENERIC };
  }

  const result = data as { status: RegistrationStatus; ticket_code: string | null };
  return { ok: true, status: result.status, ticketCode: result.ticket_code };
}
