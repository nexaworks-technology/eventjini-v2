import { SponsorPortalHeader } from "@/components/eventjini/sponsor-portal-header";
import { SponsorScanner } from "@/components/sponsor-scanner";
import { requireOwnedPortal } from "@/lib/sponsor-access";

export default async function SponsorScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sponsor, eventTitle, tierName } = await requireOwnedPortal(id);
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <SponsorPortalHeader id={id} company={sponsor.company_name} eventTitle={eventTitle} tierName={tierName} active="scan" />
      <SponsorScanner sponsorId={id} />
    </div>
  );
}
