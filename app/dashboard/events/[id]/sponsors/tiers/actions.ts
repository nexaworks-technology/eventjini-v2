"use server";

import { ADMIN_ROLES, authorizeAction } from "@/lib/event-access";
import { UUID_RE } from "@/lib/registration";

export type TierInput = { name: string; priceDisplay: string; benefits: string[] };
export type TierResult = { ok: true } | { ok: false; error: string };

function clean(i: TierInput): { error: string } | { row: { name: string; price_display: string | null; benefits: string[] } } {
  const name = i.name.trim();
  if (!name) return { error: "Tier name is required." };
  if (name.length > 120) return { error: "Tier name must be 120 characters or fewer." };
  const price = i.priceDisplay.trim();
  if (price.length > 80) return { error: "Price display must be 80 characters or fewer." };
  const benefits = i.benefits.map((b) => b.trim()).filter(Boolean);
  if (benefits.length > 30) return { error: "A tier can have at most 30 benefits." };
  if (benefits.some((b) => b.length > 200)) return { error: "Each benefit must be 200 characters or fewer." };
  return { row: { name, price_display: price || null, benefits } };
}

export async function saveTier(eventId: string, tierId: string | null, input: TierInput): Promise<TierResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (tierId && !UUID_RE.test(tierId)) return { ok: false, error: "Tier not found." };
  const c = clean(input);
  if ("error" in c) return { ok: false, error: c.error };

  if (tierId) {
    const { data, error } = await auth.supabase
      .from("sponsorship_tiers")
      .update(c.row)
      .eq("id", tierId)
      .eq("event_id", eventId)
      .select("id")
      .maybeSingle();
    if (error || !data) return { ok: false, error: "Could not save the tier. Please try again." };
    return { ok: true };
  }

  const { data: last } = await auth.supabase
    .from("sponsorship_tiers")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await auth.supabase
    .from("sponsorship_tiers")
    .insert({ ...c.row, event_id: eventId, sort_order: (last?.sort_order ?? -1) + 1 });
  if (error) return { ok: false, error: "Could not save the tier. Please try again." };
  return { ok: true };
}

export async function deleteTier(eventId: string, tierId: string): Promise<TierResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!UUID_RE.test(tierId)) return { ok: false, error: "Tier not found." };

  const { data, error } = await auth.supabase
    .from("sponsorship_tiers")
    .delete()
    .eq("id", tierId)
    .eq("event_id", eventId)
    .select("id");
  if (error) {
    if (error.code === "23503") return { ok: false, error: "This tier has sponsor applications, so it can't be deleted. Edit it instead." };
    return { ok: false, error: "Could not delete the tier." };
  }
  if (!data || data.length === 0) return { ok: false, error: "Tier not found." };
  return { ok: true };
}

export async function reorderTiers(eventId: string, ids: string[]): Promise<TierResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (ids.length > 100 || ids.some((i) => !UUID_RE.test(i))) return { ok: false, error: "Invalid order." };
  const { error } = await auth.supabase.rpc("reorder_sponsorship_tiers", { p_event_id: eventId, p_ids: ids });
  if (error) return { ok: false, error: "Could not save the new order." };
  return { ok: true };
}
