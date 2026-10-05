"use server";

import { redirect } from "next/navigation";
import { ADMIN_ROLES, authorizeAction } from "@/lib/event-access";
import { emailConfigured } from "@/lib/email/resend";
import { findUnknownVariable } from "@/lib/email/template";
import { processEmailQueue } from "@/lib/email/worker";
import { UUID_RE } from "@/lib/registration";

export type Segment = "approved" | "pending" | "checked_in";
export type SendResult = { ok: false; error: string };

const SEGMENTS: Segment[] = ["approved", "pending", "checked_in"];
const SEGMENT_LABEL: Record<Segment, string> = { approved: "Approved", pending: "Pending", checked_in: "Checked-in" };

export async function countRecipients(eventId: string, segment: Segment): Promise<number | null> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok || !SEGMENTS.includes(segment)) return null;
  const { data, error } = await auth.supabase.rpc("broadcast_recipient_count", { p_event_id: eventId, p_segment: segment });
  return error || typeof data !== "number" ? null : data;
}

export async function sendBroadcast(
  eventId: string,
  requestId: string,
  segment: Segment,
  subject: string,
  body: string
): Promise<SendResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!UUID_RE.test(requestId) || !SEGMENTS.includes(segment)) return { ok: false, error: "Invalid request." };

  const s = subject.trim();
  const b = body.trim();
  if (!s) return { ok: false, error: "Subject is required." };
  if (s.length > 200) return { ok: false, error: "Subject must be 200 characters or fewer." };
  if (!b) return { ok: false, error: "Message is required." };
  if (b.length > 10000) return { ok: false, error: "Message is too long." };
  const unknown = findUnknownVariable(s) ?? findUnknownVariable(b);
  if (unknown) return { ok: false, error: `Unknown variable {{${unknown}}}. Use first_name, event_title, event_date or event_location.` };
  if (!emailConfigured()) return { ok: false, error: "Email sending is not configured correctly." };

  const { data, error } = await auth.supabase.rpc("queue_broadcast", {
    p_event_id: eventId,
    p_request_id: requestId,
    p_segment: segment,
    p_subject: s,
    p_body: b,
  });
  if (error) {
    const m = error.message ?? "";
    if (m.includes("NO_RECIPIENTS")) return { ok: false, error: `There are no ${SEGMENT_LABEL[segment]} attendees to email.` };
    if (m.includes("UNKNOWN_VARIABLE")) return { ok: false, error: "The message uses an unknown variable." };
    return { ok: false, error: "Could not queue the broadcast. Please try again." };
  }

  const broadcastId = (data as { broadcast_id: string }).broadcast_id;
  try {
    await processEmailQueue(50);
  } catch {
    // Remaining messages stay queued and are picked up by the worker route.
  }
  redirect(`/dashboard/events/${eventId}/communications/${broadcastId}?sent=1`);
}

export async function processQueueNow(eventId: string): Promise<{ ok: boolean; message: string }> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, message: auth.error };
  if (!emailConfigured()) return { ok: false, message: "Email sending is not configured correctly." };
  const r = await processEmailQueue(50);
  if (!r.ok) return { ok: false, message: "Could not process the email queue." };
  return { ok: true, message: `Processed ${r.claimed} message${r.claimed === 1 ? "" : "s"}: ${r.sent} accepted, ${r.failed} failed.` };
}

export async function retryFailed(eventId: string, broadcastId: string): Promise<{ ok: boolean; message: string }> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, message: auth.error };
  if (!UUID_RE.test(broadcastId)) return { ok: false, message: "Broadcast not found." };
  const { data, error } = await auth.supabase.rpc("retry_failed_deliveries", { p_broadcast_id: broadcastId });
  if (error) return { ok: false, message: "Could not retry. Please try again." };
  if (!data) return { ok: true, message: "There are no failed messages to retry." };
  if (emailConfigured()) await processEmailQueue(50);
  return { ok: true, message: `Retried ${data} failed message${data === 1 ? "" : "s"}. Messages already accepted were not resent.` };
}
