import Link from "next/link";
import { SponsorScanner } from "@/components/sponsor-scanner";
import { requireOwnedPortal } from "@/lib/sponsor-access";

export default async function SponsorScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sponsor, eventTitle } = await requireOwnedPortal(id);
  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-6 px-4 py-10">
      <div>
        <Link href={`/dashboard/sponsor/portal/${id}`} className="text-sm text-zinc-500 hover:underline">← {sponsor.company_name}</Link>
        <p className="text-sm text-zinc-600">{eventTitle}</p>
        <h1 className="text-2xl font-semibold text-zinc-900">Capture a lead</h1>
      </div>
      <SponsorScanner sponsorId={id} />
    </main>
  );
}
