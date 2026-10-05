"use server";

import { authorizeAction, CHECKIN_ROLES } from "@/lib/event-access";

export type CheckInOutcome =
  | {
      result: "success" | "already_checked_in";
      firstName: string;
      lastName: string;
      companyName: string | null;
      checkedInAt: string;
      eventTitle: string;
    }
  | { result: "not_found" | "not_approved" | "cancelled" | "wrong_event" | "unauthorized" | "error" };

export type GuestHit = {
  first_name: string;
  last_name: string;
  company_name: string | null;
  status: string;
  ticket_code: string;
};

const CODE_IN_TEXT = /EVJ-[0-9A-Fa-f]{16}/;

export async function checkInTicket(
  eventId: string,
  rawCode: string,
  method: "qr" | "manual"
): Promise<CheckInOutcome> {
  const auth = await authorizeAction(eventId, CHECKIN_ROLES);
  if (!auth.ok) return { result: "unauthorized" };

  const trimmed = rawCode.trim().slice(0, 200);
  const code = (CODE_IN_TEXT.exec(trimmed)?.[0] ?? trimmed).toUpperCase();

  const { data, error } = await auth.supabase.rpc("check_in_ticket", {
    p_event_id: eventId,
    p_ticket_code: code,
    p_method: method,
  });
  if (error || !data) return { result: "error" };

  const d = data as Record<string, string | null>;
  switch (d.result) {
    case "success":
    case "already_checked_in":
      return {
        result: d.result,
        firstName: d.first_name ?? "",
        lastName: d.last_name ?? "",
        companyName: d.company_name ?? null,
        checkedInAt: d.checked_in_at ?? "",
        eventTitle: d.event_title ?? "",
      };
    case "not_found":
    case "not_approved":
    case "cancelled":
    case "wrong_event":
    case "unauthorized":
      return { result: d.result };
    default:
      return { result: "error" };
  }
}

export async function searchGuestsForCheckIn(eventId: string, query: string): Promise<GuestHit[]> {
  const auth = await authorizeAction(eventId, CHECKIN_ROLES);
  if (!auth.ok) return [];
  const { data, error } = await auth.supabase.rpc("search_checkin_guests", {
    p_event_id: eventId,
    p_query: query.slice(0, 100),
  });
  if (error || !Array.isArray(data)) return [];
  return data as GuestHit[];
}
