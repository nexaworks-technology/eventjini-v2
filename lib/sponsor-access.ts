import { notFound, redirect } from "next/navigation";
import { UUID_RE } from "@/lib/registration";
import { createClient } from "@/utils/supabase/server";

export type PortalState = { state: "none" | "pending" | "rejected" | "claimable" | "owner"; company_name?: string; event_title?: string };

export async function loadPortal(id: string) {
  if (!UUID_RE.test(id)) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect(`/login?next=${encodeURIComponent(`/dashboard/sponsor/portal/${id}`)}`);

  const { data } = await supabase.rpc("sponsor_portal_state", { p_id: id });
  return { supabase, user, portal: ((data as PortalState | null) ?? { state: "none" }) as PortalState };
}

/** Pages that need the sponsor to own an approved portal. Anything else is a 404. */
export async function requireOwnedPortal(id: string) {
  const ctx = await loadPortal(id);
  if (ctx.portal.state !== "owner") notFound();

  const { data: sr } = await ctx.supabase
    .from("sponsor_registrations")
    .select("id,event_id,tier_id,company_name,logo_url")
    .eq("id", id)
    .eq("sponsor_user_id", ctx.user.id)
    .eq("status", "approved")
    .maybeSingle();
  if (!sr) notFound();

  const [{ data: event }, { data: tier }] = await Promise.all([
    ctx.supabase.from("events").select("title").eq("id", sr.event_id).maybeSingle(),
    ctx.supabase.from("sponsorship_tiers").select("name").eq("id", sr.tier_id).maybeSingle(),
  ]);
  return { ...ctx, sponsor: sr, eventTitle: event?.title ?? "Event", tierName: tier?.name ?? "Sponsor" };
}
