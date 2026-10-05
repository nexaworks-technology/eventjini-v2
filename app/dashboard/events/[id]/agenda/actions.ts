"use server";

import { ADMIN_ROLES, authorizeAction } from "@/lib/event-access";
import { UUID_RE } from "@/lib/registration";
import { zonedToUtc } from "@/lib/time";

export type SessionInput = {
  title: string;
  description: string;
  speaker: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};

export type SessionResult = { ok: true; warning?: string } | { ok: false; error: string };

export async function saveSession(
  eventId: string,
  sessionId: string | null,
  input: SessionInput
): Promise<SessionResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (sessionId && !UUID_RE.test(sessionId)) return { ok: false, error: "Session not found." };

  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title is required." };
  if (title.length > 200) return { ok: false, error: "Title must be 200 characters or fewer." };

  const { data: event } = await auth.supabase
    .from("events")
    .select("timezone,start_at,end_at")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return { ok: false, error: "Event not found." };

  if (!input.startDate || !input.startTime || !input.endDate || !input.endTime) {
    return { ok: false, error: "Start and end date and time are required." };
  }
  const start = zonedToUtc(input.startDate, input.startTime, event.timezone);
  const end = zonedToUtc(input.endDate, input.endTime, event.timezone);
  if (!start || !end) return { ok: false, error: "Enter a valid start and end time." };
  if (end <= start) return { ok: false, error: "End time must be after the session start time." };

  const row = {
    title,
    description: input.description.trim() || null,
    speaker: input.speaker.trim() || null,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
  };

  const { data, error } = sessionId
    ? await auth.supabase.from("event_sessions").update(row).eq("id", sessionId).eq("event_id", eventId).select("id").maybeSingle()
    : await auth.supabase.from("event_sessions").insert({ ...row, event_id: eventId }).select("id").maybeSingle();

  if (error || !data) return { ok: false, error: "Could not save the session. Please try again." };

  const outside = end <= new Date(event.start_at) || start >= new Date(event.end_at);
  return outside
    ? { ok: true, warning: "Saved, but this session falls completely outside the event's start and end time." }
    : { ok: true };
}

export async function deleteSession(eventId: string, sessionId: string): Promise<SessionResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!UUID_RE.test(sessionId)) return { ok: false, error: "Session not found." };

  const { data, error } = await auth.supabase
    .from("event_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("event_id", eventId)
    .select("id");
  if (error || !data || data.length === 0) return { ok: false, error: "Could not delete the session." };
  return { ok: true };
}
