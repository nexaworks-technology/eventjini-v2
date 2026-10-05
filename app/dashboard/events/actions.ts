"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SLUG_RE } from "@/lib/slug";
import { validateEventValues, type EventFormValues, type FieldErrors } from "@/lib/events";

export type SaveResult = { ok: false; error?: string; fieldErrors?: FieldErrors };

export type SlugCheck = { state: "available" | "taken" | "invalid" | "error" };

export async function checkSlugAvailability(
  slug: string,
  excludeId?: string
): Promise<SlugCheck> {
  if (!SLUG_RE.test(slug)) return { state: "invalid" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { state: "error" };

  const { data, error } = await supabase.rpc("is_slug_available", {
    p_slug: slug,
    p_exclude_id: excludeId ?? null,
  });
  if (error || typeof data !== "boolean") return { state: "error" };
  return { state: data ? "available" : "taken" };
}

const SLUG_TAKEN = "That event URL is already in use. Choose another slug.";
const GENERIC_ERROR = "Could not save the event. Please try again.";

export async function saveEvent(
  values: EventFormValues,
  intent: "draft" | "publish" | "save",
  eventId?: string
): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/login");

  const { errors, startAt, endAt, capacity } = validateEventValues(values);
  if (Object.keys(errors).length > 0 || !startAt || !endAt) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: errors };
  }

  const fields = {
    title: values.title.trim(),
    slug: values.slug,
    description: values.description.trim() || null,
    cover_image_url: values.coverImageUrl.trim() || null,
    location: values.location.trim() || null,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    timezone: values.timezone,
    capacity,
    requires_approval: values.requiresApproval,
    require_b2b_data: values.requireB2bData,
  };

  let savedId: string;

  if (eventId) {
    const update = intent === "publish" ? { ...fields, status: "published" as const } : fields;
    const { data, error } = await supabase
      .from("events")
      .update(update)
      .eq("id", eventId)
      .select("id")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") return { ok: false, fieldErrors: { slug: SLUG_TAKEN }, error: SLUG_TAKEN };
      return { ok: false, error: GENERIC_ERROR };
    }
    if (!data) return { ok: false, error: "Event not found or you do not have access to it." };
    savedId = data.id;
  } else {
    const { data, error } = await supabase
      .from("events")
      .insert({
        ...fields,
        organizer_id: user.id,
        status: intent === "publish" ? "published" : "draft",
      })
      .select("id")
      .single();

    if (error || !data) {
      if (error?.code === "23505") return { ok: false, fieldErrors: { slug: SLUG_TAKEN }, error: SLUG_TAKEN };
      return { ok: false, error: GENERIC_ERROR };
    }
    savedId = data.id;
  }

  redirect(`/dashboard/events/${savedId}${intent === "publish" ? "?published=1" : ""}`);
}

export async function publishEvent(eventId: string): Promise<{ ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/login");

  const { data, error } = await supabase
    .from("events")
    .update({ status: "published" })
    .eq("id", eventId)
    .select("id")
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Could not publish the event. Please try again." };
  redirect(`/dashboard/events/${eventId}?published=1`);
}
