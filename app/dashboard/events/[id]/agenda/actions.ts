"use server";

import { NAME_MAX, SESSION_TYPES, TITLE_MAX, type SessionInput } from "@/lib/agenda";
import { ADMIN_ROLES, authorizeAction } from "@/lib/event-access";
import { UUID_RE } from "@/lib/registration";
import { formatEventWhen, zonedToUtc } from "@/lib/time";

export type SessionResult = { ok: true; warning?: string } | { ok: false; error: string };
export type SimpleResult = { ok: true } | { ok: false; error: string };

const MAX_DURATION_MIN = 24 * 60;

export async function saveSession(eventId: string, sessionId: string | null, input: SessionInput): Promise<SessionResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (sessionId && !UUID_RE.test(sessionId)) return { ok: false, error: "Session not found." };

  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title is required." };
  if (title.length > TITLE_MAX) return { ok: false, error: `Title must be ${TITLE_MAX} characters or fewer.` };
  if (!SESSION_TYPES.some((t) => t.value === input.sessionType)) return { ok: false, error: "Choose a session type." };
  for (const id of [input.trackId, input.hallId]) if (id !== null && !UUID_RE.test(id)) return { ok: false, error: "Invalid track or hall." };
  const speakerIds = [...new Set(input.speakerIds ?? [])];
  if (speakerIds.some((s) => !UUID_RE.test(s)) || speakerIds.length > 20) return { ok: false, error: "Choose valid speakers." };

  const { data: event } = await auth.supabase.from("events").select("timezone,start_at,end_at").eq("id", eventId).maybeSingle();
  if (!event) return { ok: false, error: "Event not found." };

  let start: Date | null = null;
  let end: Date | null = null;
  if (!input.tba) {
    const duration = Math.round(Number(input.durationMin));
    if (!input.date || !input.startTime) return { ok: false, error: "Choose a day and start time, or mark the time as to be announced." };
    if (!Number.isFinite(duration) || duration < 5 || duration > MAX_DURATION_MIN) return { ok: false, error: "Duration must be between 5 minutes and 24 hours." };
    start = zonedToUtc(input.date, input.startTime, event.timezone);
    if (!start) return { ok: false, error: "Enter a valid start time." };
    end = new Date(start.getTime() + duration * 60_000);
    if (start < new Date(event.start_at) || end > new Date(event.end_at)) {
      const w = formatEventWhen(event.start_at, event.end_at, event.timezone);
      return { ok: false, error: `Sessions must fall within the event's dates and times (${w.date}, ${w.time}).` };
    }
  }

  const row = {
    title,
    description: input.description.trim() || null,
    speaker: input.speakerText.trim() || null,
    session_type: input.sessionType,
    is_featured: input.isFeatured,
    track_id: input.trackId,
    hall_id: input.hallId,
    start_at: start?.toISOString() ?? null,
    end_at: end?.toISOString() ?? null,
  };

  const { data, error } = sessionId
    ? await auth.supabase.from("event_sessions").update(row).eq("id", sessionId).eq("event_id", eventId).select("id").maybeSingle()
    : await auth.supabase.from("event_sessions").insert({ ...row, event_id: eventId }).select("id").maybeSingle();
  if (error?.code === "23503") return { ok: false, error: "That track or hall no longer exists. Refresh and try again." };
  if (error || !data) return { ok: false, error: "Could not save the session. Please try again." };

  // Replace the speaker links. The DB trigger rejects speakers from another event.
  const { error: unlinkError } = await auth.supabase.from("event_session_speakers").delete().eq("session_id", data.id).eq("event_id", eventId);
  if (unlinkError) return { ok: false, error: "The session was saved, but its speakers could not be updated." };
  if (speakerIds.length) {
    const { error: linkError } = await auth.supabase
      .from("event_session_speakers")
      .insert(speakerIds.map((speaker_id, i) => ({ session_id: data.id, speaker_id, event_id: eventId, sort_order: i })));
    if (linkError) return { ok: false, error: "The session was saved, but its speakers could not be updated." };
  }

  // Same hall, overlapping time: allowed (plans change), but worth flagging.
  if (start && end && input.hallId) {
    const { data: clash } = await auth.supabase
      .from("event_sessions")
      .select("title")
      .eq("event_id", eventId)
      .eq("hall_id", input.hallId)
      .neq("id", data.id)
      .lt("start_at", end.toISOString())
      .gt("end_at", start.toISOString())
      .limit(1);
    if (clash?.length) return { ok: true, warning: `Saved. Note: "${clash[0].title}" is in the same hall at an overlapping time.` };
  }
  return { ok: true };
}

export async function deleteSession(eventId: string, sessionId: string): Promise<SimpleResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!UUID_RE.test(sessionId)) return { ok: false, error: "Session not found." };
  const { data, error } = await auth.supabase.from("event_sessions").delete().eq("id", sessionId).eq("event_id", eventId).select("id");
  if (error || !data || data.length === 0) return { ok: false, error: "Could not delete the session." };
  return { ok: true };
}

type NamedTable = "event_tracks" | "event_halls";
const NOUN: Record<NamedTable, string> = { event_tracks: "track", event_halls: "hall" };

async function saveNamed(table: NamedTable, eventId: string, id: string | null, nameInput: string): Promise<SimpleResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (id && !UUID_RE.test(id)) return { ok: false, error: `That ${NOUN[table]} no longer exists.` };
  const name = nameInput.trim();
  if (!name) return { ok: false, error: "Enter a name." };
  if (name.length > NAME_MAX) return { ok: false, error: `Names can be up to ${NAME_MAX} characters.` };

  if (id) {
    const { data, error } = await auth.supabase.from(table).update({ name }).eq("id", id).eq("event_id", eventId).select("id");
    if (error || !data?.length) return { ok: false, error: `Could not rename the ${NOUN[table]}.` };
    return { ok: true };
  }
  const { count } = await auth.supabase.from(table).select("id", { count: "exact", head: true }).eq("event_id", eventId);
  if ((count ?? 0) >= 20) return { ok: false, error: `An event can have up to 20 ${NOUN[table]}s.` };
  const { error } = await auth.supabase.from(table).insert({ event_id: eventId, name, sort_order: count ?? 0 });
  return error ? { ok: false, error: `Could not add the ${NOUN[table]}.` } : { ok: true };
}

async function deleteNamed(table: NamedTable, eventId: string, id: string): Promise<SimpleResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!UUID_RE.test(id)) return { ok: false, error: `That ${NOUN[table]} no longer exists.` };
  const { data, error } = await auth.supabase.from(table).delete().eq("id", id).eq("event_id", eventId).select("id");
  if (error?.code === "23503") return { ok: false, error: "This track still has sessions. Move them to another track or delete them first." };
  if (error || !data?.length) return { ok: false, error: `Could not delete the ${NOUN[table]}.` };
  return { ok: true };
}

export async function saveTrack(eventId: string, id: string | null, name: string) {
  return saveNamed("event_tracks", eventId, id, name);
}
export async function deleteTrack(eventId: string, id: string) {
  return deleteNamed("event_tracks", eventId, id);
}
export async function saveHall(eventId: string, id: string | null, name: string) {
  return saveNamed("event_halls", eventId, id, name);
}
export async function deleteHall(eventId: string, id: string) {
  return deleteNamed("event_halls", eventId, id);
}
