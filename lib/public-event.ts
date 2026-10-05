import type { EventRow } from "@/lib/events";
import { SLUG_RE } from "@/lib/slug";
import { createClient } from "@/utils/supabase/server";
import type { RegistrationRow } from "@/lib/registration";

export async function getPublishedEvent(slug: string): Promise<EventRow | null> {
  if (!SLUG_RE.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return (data as EventRow | null) ?? null;
}

export async function getViewerState(event: EventRow) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: seats } = await supabase.rpc("event_seats_taken", { p_event_id: event.id });
  const seatsTaken = typeof seats === "number" ? seats : 0;
  const soldOut = event.capacity !== null && seatsTaken >= event.capacity;

  let registration: RegistrationRow | null = null;
  if (user) {
    const { data } = await supabase
      .from("registrations")
      .select("*")
      .eq("event_id", event.id)
      .eq("owner_user_id", user.id)
      .maybeSingle();
    registration = (data as RegistrationRow | null) ?? null;
  }

  return { soldOut, seatsTaken, registration };
}
