import { PageHeader } from "@/components/eventjini/page-header";
import Link from "next/link";
import { TierManager } from "@/components/tier-manager";
import { ADMIN_ROLES, requireEventAccess } from "@/lib/event-access";
import type { Tier } from "@/lib/sponsors";

export default async function TiersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireEventAccess(id, ADMIN_ROLES);
  const { data } = await supabase.from("sponsorship_tiers").select("*").eq("event_id", id).order("sort_order");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/dashboard/events/${id}/sponsors`} className="text-sm text-muted-foreground hover:underline">← Sponsors</Link>
        <PageHeader level={2} title={"Sponsorship tiers"} description={<>Prices are display text only. EventJini does not process sponsor payments.</>} />
      </div>
      <TierManager eventId={id} tiers={(data ?? []) as Tier[]} />
    </div>
  );
}
