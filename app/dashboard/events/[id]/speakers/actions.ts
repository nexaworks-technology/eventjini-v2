"use server";

import { ADMIN_ROLES, authorizeAction } from "@/lib/event-access";
import { UUID_RE } from "@/lib/registration";
import { validateSpeaker, type SpeakerInput } from "@/lib/speakers";

export type SpeakerResult = { ok: true; id: string } | { ok: false; error: string };

const BUCKET = "event-assets";
const PHOTO_PATH = (eventId: string) =>
  new RegExp(`^events/${eventId}/speakers/[A-Za-z0-9][A-Za-z0-9._-]*\\.(jpg|jpeg|png|webp)$`);
const publicPrefix = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;

/**
 * Creates or updates a speaker. `photo` is: undefined = keep, null = remove,
 * or a storage path the client already uploaded under events/<id>/speakers/.
 */
export async function saveSpeaker(
  eventId: string,
  speakerId: string | null,
  input: SpeakerInput,
  photo?: string | null
): Promise<SpeakerResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (speakerId && !UUID_RE.test(speakerId)) return { ok: false, error: "Speaker not found." };
  if (typeof photo === "string" && !PHOTO_PATH(eventId).test(photo)) return { ok: false, error: "Invalid photo." };

  const v = validateSpeaker(input);
  if (!v.ok) return v;

  let previousPhoto: string | null = null;
  if (speakerId && photo !== undefined) {
    const { data } = await auth.supabase.from("event_speakers").select("photo_url").eq("id", speakerId).eq("event_id", eventId).maybeSingle();
    previousPhoto = data?.photo_url ?? null;
  }

  const row = photo === undefined ? v.row : { ...v.row, photo_url: photo ? publicPrefix() + photo : null };
  const { data, error } = speakerId
    ? await auth.supabase.from("event_speakers").update(row).eq("id", speakerId).eq("event_id", eventId).select("id").maybeSingle()
    : await auth.supabase.from("event_speakers").insert({ ...row, event_id: eventId }).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "Could not save the speaker. Please try again." };

  await removePhoto(auth.supabase, eventId, previousPhoto, photo);
  return { ok: true, id: data.id };
}

export async function deleteSpeaker(eventId: string, speakerId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!UUID_RE.test(speakerId)) return { ok: false, error: "Speaker not found." };

  const { data, error } = await auth.supabase
    .from("event_speakers")
    .delete()
    .eq("id", speakerId)
    .eq("event_id", eventId)
    .select("photo_url");
  if (error || !data || data.length === 0) return { ok: false, error: "Could not delete the speaker." };
  await removePhoto(auth.supabase, eventId, data[0].photo_url, null);
  return { ok: true };
}

type Client = Extract<Awaited<ReturnType<typeof authorizeAction>>, { ok: true }>["supabase"];

/** Best-effort cleanup of a replaced or removed photo; never fails the save. */
async function removePhoto(supabase: Client, eventId: string, previousUrl: string | null, kept: string | null | undefined) {
  if (!previousUrl || !previousUrl.startsWith(publicPrefix())) return;
  const path = previousUrl.slice(publicPrefix().length);
  if (path === kept || !PHOTO_PATH(eventId).test(path)) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
