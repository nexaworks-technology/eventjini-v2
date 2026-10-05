import Link from "next/link";
import { EventNav } from "@/components/event-nav";
import { TierManager } from "@/components/tier-manager";
import { ADMIN_ROLES, requireEventAccess } from "@/lib/event-access";
import type { Tier } from "@/lib/sponsors";

export default async function TiersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, event, role } = await requireEventAccess(id, ADMIN_ROLES);
  const { data } = await supabase.from("sponsorship_tiers").select("*").eq("event_id", id).order("sort_order");

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-6 px-4 py-10">
      <EventNav eventId={id} eventTitle={event.title} role={role} active="sponsors" />
      <div>
        <Link href={`/dashboard/events/${id}/sponsors`} className="text-sm text-zinc-500 hover:underline">← Sponsors</Link>
        <h2 className="text-xl font-semibold text-zinc-900">Sponsorship tiers</h2>
        <p className="text-sm text-zinc-600">Prices are display text only. EventJini does not process sponsor payments.</p>
      </div>
      <TierManager eventId={id} tiers={(data ?? []) as Tier[]} />
    </main>
  );
}
