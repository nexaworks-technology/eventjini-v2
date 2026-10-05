import type { SupabaseClient } from "@supabase/supabase-js";
import type { RegistrationRow, RegistrationStatus } from "@/lib/registration";

export type GuestFilter = "all" | RegistrationStatus;
export const GUEST_FILTERS: { key: GuestFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "checked_in", label: "Checked in" },
  { key: "cancelled", label: "Cancelled" },
];

export function parseFilter(v: string | undefined): GuestFilter {
  return GUEST_FILTERS.some((f) => f.key === v) ? (v as GuestFilter) : "all";
}

/** Keeps letters, digits and a few email/ticket-code characters so the value is safe inside a PostgREST filter. */
export function sanitizeSearch(q: string | undefined): string {
  return (q ?? "").replace(/[^\p{L}\p{N}@.\-+ ]/gu, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function queryGuests(
  supabase: SupabaseClient,
  eventId: string,
  q: string,
  filter: GuestFilter,
  limit: number
) {
  let query = supabase
    .from("registrations")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filter !== "all") query = query.eq("status", filter);
  if (q) {
    const p = `*${q}*`;
    query = query.or(
      [`first_name.ilike.${p}`, `last_name.ilike.${p}`, `email.ilike.${p}`, `company_name.ilike.${p}`, `ticket_code.ilike.${p}`].join(",")
    );
  }
  const { data, error } = await query;
  return { rows: (data ?? []) as RegistrationRow[], error };
}
