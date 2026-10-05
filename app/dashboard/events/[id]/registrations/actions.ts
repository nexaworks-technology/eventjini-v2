"use server";

import { redirect } from "next/navigation";
import { UUID_RE } from "@/lib/registration";
import { createClient } from "@/utils/supabase/server";

export type DecisionResult = { ok: true } | { ok: false; error: string };

async function decide(registrationId: string, fn: "approve_event_registration" | "reject_event_registration"): Promise<DecisionResult> {
  if (!UUID_RE.test(registrationId)) return { ok: false, error: "Registration not found." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/login");

  const { error } = await supabase.rpc(fn, { p_registration_id: registrationId });
  if (error) {
    const m = error.message ?? "";
    if (m.includes("SOLD_OUT")) return { ok: false, error: "Cannot approve registration. This event is sold out." };
    if (m.includes("NOT_PENDING")) return { ok: false, error: "This registration has already been reviewed." };
    if (m.includes("NOT_FOUND")) return { ok: false, error: "Registration not found." };
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  return { ok: true };
}

export async function approveRegistration(registrationId: string) {
  return decide(registrationId, "approve_event_registration");
}

export async function rejectRegistration(registrationId: string) {
  return decide(registrationId, "reject_event_registration");
}
