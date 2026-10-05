"use server";

import { ADMIN_ROLES, authorizeAction } from "@/lib/event-access";
import { normalizeHex } from "@/lib/branding";
import { CURRENCIES } from "@/lib/money";
import { UUID_RE } from "@/lib/registration";

export type SettingsResult = { ok: true } | { ok: false; error: string };

const BUCKET = "event-assets";
const COVER_PATH = (eventId: string) =>
  new RegExp(`^events/${eventId}/cover/[A-Za-z0-9][A-Za-z0-9._-]*\\.(jpg|jpeg|png|webp)$`);

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}
function pathFromPublicUrl(url: string | null): string | null {
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
  return url && url.startsWith(prefix) ? url.slice(prefix.length) : null;
}

export async function saveBranding(eventId: string, primary: string, accent: string, currency: string): Promise<SettingsResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };

  const p = primary.trim() ? normalizeHex(primary) : null;
  const a = accent.trim() ? normalizeHex(accent) : null;
  if (primary.trim() && !p) return { ok: false, error: "Primary color must be a hex value like #C2410C." };
  if (accent.trim() && !a) return { ok: false, error: "Accent color must be a hex value like #F97316." };
  if (!(CURRENCIES as readonly string[]).includes(currency)) return { ok: false, error: "Choose a supported currency." };

  const { data, error } = await auth.supabase
    .from("events")
    .update({ primary_color: p, accent_color: a, currency })
    .eq("id", eventId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Could not save branding. Please try again." };
  return { ok: true };
}

export async function setCoverImage(eventId: string, objectPath: string): Promise<SettingsResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!UUID_RE.test(eventId) || !COVER_PATH(eventId).test(objectPath)) return { ok: false, error: "Invalid cover image." };

  const { data: current } = await auth.supabase.from("events").select("cover_image_url").eq("id", eventId).maybeSingle();
  const previous = pathFromPublicUrl(current?.cover_image_url ?? null);

  const { data, error } = await auth.supabase
    .from("events")
    .update({ cover_image_url: publicUrl(objectPath) })
    .eq("id", eventId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Could not save the cover image. Please try again." };

  if (previous && previous !== objectPath && COVER_PATH(eventId).test(previous)) {
    await auth.supabase.storage.from(BUCKET).remove([previous]);
  }
  return { ok: true };
}

export async function removeCoverImage(eventId: string): Promise<SettingsResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };

  const { data: current } = await auth.supabase.from("events").select("cover_image_url").eq("id", eventId).maybeSingle();
  const previous = pathFromPublicUrl(current?.cover_image_url ?? null);

  const { data, error } = await auth.supabase.from("events").update({ cover_image_url: null }).eq("id", eventId).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "Could not remove the cover image." };
  if (previous && COVER_PATH(eventId).test(previous)) await auth.supabase.storage.from(BUCKET).remove([previous]);
  return { ok: true };
}

export async function unpublishEvent(eventId: string): Promise<SettingsResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { data, error } = await auth.supabase
    .from("events")
    .update({ status: "draft" })
    .eq("id", eventId)
    .eq("status", "published")
    .select("id");
  if (error || !data || data.length === 0) return { ok: false, error: "The event is not published." };
  return { ok: true };
}
