import Link from "next/link";
import { notFound } from "next/navigation";
import { ClaimPortalButton } from "@/components/claim-portal-button";
import { SponsorProfileForm } from "@/components/sponsor-profile-form";
import { loadPortal, requireOwnedPortal } from "@/lib/sponsor-access";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-start justify-center bg-zinc-50 px-4 py-10">
      <div className="w-full max-w-lg space-y-5 rounded-xl bg-white p-8 shadow-sm">{children}</div>
    </main>
  );
}

export default async function SponsorPortalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { portal } = await loadPortal(id);

  if (portal.state === "none") notFound();
  if (portal.state === "pending")
    return <Shell><p className="text-center text-zinc-700">This sponsorship application has not been approved yet.</p></Shell>;
  if (portal.state === "rejected")
    return <Shell><p className="text-center text-zinc-700">This sponsorship application is not active.</p></Shell>;
  if (portal.state === "claimable")
    return (
      <Shell>
        <div className="space-y-1 text-center">
          <p className="text-sm font-semibold tracking-wide text-zinc-500">EventJini</p>
          <h1 className="text-xl font-semibold text-zinc-900">Sponsor portal</h1>
          <p className="text-sm text-zinc-600">{portal.company_name} · {portal.event_title}</p>
        </div>
        <ClaimPortalButton id={id} />
      </Shell>
    );

  const { supabase, sponsor, eventTitle, tierName } = await requireOwnedPortal(id);
  const { count } = await supabase.from("sponsor_leads").select("id", { count: "exact", head: true }).eq("sponsor_registration_id", id);

  return (
    <Shell>
      <div className="space-y-1">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:underline">← Dashboard</Link>
        <p className="text-sm text-zinc-600">{eventTitle}</p>
        <h1 className="text-2xl font-semibold text-zinc-900">Sponsor Portal</h1>
        <p className="font-medium text-zinc-800">{sponsor.company_name}</p>
        <p className="text-sm text-zinc-600">{tierName} Sponsor</p>
        {sponsor.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sponsor.logo_url} alt={`${sponsor.company_name} logo`} className="mt-2 h-16 max-w-48 object-contain" />
        )}
      </div>

      <section className="space-y-3 border-t border-zinc-100 pt-4">
        <h2 className="font-semibold text-zinc-900">Company profile</h2>
        <SponsorProfileForm id={id} companyName={sponsor.company_name} logoUrl={sponsor.logo_url} />
      </section>

      <section className="space-y-3 border-t border-zinc-100 pt-4">
        <h2 className="font-semibold text-zinc-900">Lead capture</h2>
        <p className="text-sm text-zinc-600">{count ?? 0} lead{count === 1 ? "" : "s"} captured</p>
        <div className="flex gap-3">
          <Link href={`/dashboard/sponsor/portal/${id}/scan`} className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">Scan attendee</Link>
          <Link href={`/dashboard/sponsor/portal/${id}/leads`} className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50">View leads</Link>
        </div>
      </section>
    </Shell>
  );
}
