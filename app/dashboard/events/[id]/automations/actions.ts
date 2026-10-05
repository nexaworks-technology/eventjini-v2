"use server";

import { ADMIN_ROLES, authorizeAction } from "@/lib/event-access";
import { findUnknownVariable } from "@/lib/email/template";
import { UUID_RE } from "@/lib/registration";

export type TriggerType = "registration_approved" | "event_start_24h";
export type AutomationInput = { name: string; trigger: TriggerType; subject: string; body: string; enabled: boolean };
export type AutomationResult = { ok: true } | { ok: false; error: string };

const TRIGGERS: TriggerType[] = ["registration_approved", "event_start_24h"];

function validate(i: AutomationInput): string | null {
  if (!i.name.trim()) return "Automation name is required.";
  if (i.name.length > 120) return "Name must be 120 characters or fewer.";
  if (!TRIGGERS.includes(i.trigger)) return "Choose a trigger.";
  if (!i.subject.trim()) return "Subject is required.";
  if (i.subject.length > 200) return "Subject must be 200 characters or fewer.";
  if (!i.body.trim()) return "Message is required.";
  if (i.body.length > 10000) return "Message is too long.";
  const unknown = findUnknownVariable(i.subject) ?? findUnknownVariable(i.body);
  if (unknown) return `Unknown variable {{${unknown}}}. Use first_name, event_title, event_date or event_location.`;
  return null;
}

export async function saveAutomation(eventId: string, automationId: string | null, input: AutomationInput): Promise<AutomationResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (automationId && !UUID_RE.test(automationId)) return { ok: false, error: "Automation not found." };
  const problem = validate(input);
  if (problem) return { ok: false, error: problem };

  const row = {
    name: input.name.trim(),
    trigger_type: input.trigger,
    subject: input.subject.trim(),
    body_text: input.body.trim(),
    enabled: input.enabled,
  };
  const { data, error } = automationId
    ? await auth.supabase.from("event_automations").update(row).eq("id", automationId).eq("event_id", eventId).select("id").maybeSingle()
    : await auth.supabase.from("event_automations").insert({ ...row, event_id: eventId, created_by: auth.userId }).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "Could not save the automation. Please try again." };
  return { ok: true };
}

export async function setAutomationEnabled(eventId: string, automationId: string, enabled: boolean): Promise<AutomationResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!UUID_RE.test(automationId)) return { ok: false, error: "Automation not found." };
  const { data, error } = await auth.supabase
    .from("event_automations")
    .update({ enabled })
    .eq("id", automationId)
    .eq("event_id", eventId)
    .select("id");
  if (error || !data || data.length === 0) return { ok: false, error: "Could not update the automation." };
  return { ok: true };
}

export async function deleteAutomation(eventId: string, automationId: string): Promise<AutomationResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!UUID_RE.test(automationId)) return { ok: false, error: "Automation not found." };
  const { data, error } = await auth.supabase
    .from("event_automations")
    .delete()
    .eq("id", automationId)
    .eq("event_id", eventId)
    .select("id");
  if (error || !data || data.length === 0) return { ok: false, error: "Could not delete the automation." };
  return { ok: true };
}
