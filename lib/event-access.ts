import { notFound, redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventRow } from "@/lib/events";
import { UUID_RE } from "@/lib/registration";
import { createClient } from "@/utils/supabase/server";

export type EventRole = "owner" | "admin" | "scanner" | "viewer";

export const ROLE_LABELS: Record<EventRole, string> = {
  owner: "Owner",
  admin: "Admin",
  scanner: "Scanner",
  viewer: "Viewer",
};

export const ADMIN_ROLES: EventRole[] = ["owner", "admin"];
export const CHECKIN_ROLES: EventRole[] = ["owner", "admin", "scanner"];
export const TASK_READ_ROLES: EventRole[] = ["owner", "admin", "viewer"];

export async function getEventRole(supabase: SupabaseClient, eventId: string): Promise<EventRole | null> {
  const { data } = await supabase.rpc("event_role", { p_event_id: eventId });
  return typeof data === "string" ? (data as EventRole) : null;
}

/** Page-level guard. The database policies remain the real authority; this keeps the UI honest. */
export async function requireEventAccess(eventId: string, allowed?: EventRole[]) {
  if (!UUID_RE.test(eventId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/login");

  const role = await getEventRole(supabase, eventId);
  if (!role) redirect("/dashboard/events?access=removed");
  if (allowed && !allowed.includes(role)) redirect(`/dashboard/events/${eventId}?denied=1`);

  const { data } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
  if (!data) notFound();

  return { supabase, user, event: data as EventRow, role };
}

export type ActionAuth =
  | { ok: true; supabase: SupabaseClient; userId: string; role: EventRole }
  | { ok: false; error: string };

/** Action-level guard: returns an error result instead of redirecting. */
export async function authorizeAction(eventId: string, allowed: EventRole[]): Promise<ActionAuth> {
  if (!UUID_RE.test(eventId)) return { ok: false, error: "Event not found." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return { ok: false, error: "Your session has expired. Please sign in again." };

  const role = await getEventRole(supabase, eventId);
  if (!role) return { ok: false, error: "You no longer have access to this event." };
  if (!allowed.includes(role)) return { ok: false, error: "You don't have permission to do that." };
  return { ok: true, supabase, userId: user.id, role };
}
