import { btnPrimary, btnSecondary } from "@/components/eventjini/classes";
import { ScanLine } from "lucide-react";
import Link from "next/link";
import { FormSection } from "@/components/eventjini/form-section";
import { MetricCard } from "@/components/eventjini/metric-card";
import { SponsorPortalHeader } from "@/components/eventjini/sponsor-portal-header";
import { cn } from "@/lib/utils";
import { notFound } from "next/navigation";
import { ClaimPortalButton } from "@/components/claim-portal-button";
import { SponsorProfileForm } from "@/components/sponsor-profile-form";
import { loadPortal, requireOwnedPortal } from "@/lib/sponsor-access";

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-md space-y-5 rounded-xl border bg-card p-8 text-card-foreground">{children}</div>;
}

export default async function SponsorPortalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { portal } = await loadPortal(id);

  if (portal.state === "none") notFound();
  if (portal.state === "pending")
    return <Shell><p className="text-center text-foreground">This sponsorship application has not been approved yet.</p></Shell>;
  if (portal.state === "rejected")
    return <Shell><p className="text-center text-foreground">This sponsorship application is not active.</p></Shell>;
  if (portal.state === "claimable")
    return (
      <Shell>
        <div className="space-y-1 text-center">
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Sponsor Portal</p>
          <h1 className="font-heading text-xl font-semibold">Claim your sponsor portal</h1>
          <p className="text-sm text-muted-foreground">{portal.company_name} · {portal.event_title}</p>
        </div>
        <ClaimPortalButton id={id} />
      </Shell>
    );

  const { supabase, sponsor, eventTitle, tierName } = await requireOwnedPortal(id);
  const { count } = await supabase.from("sponsor_leads").select("id", { count: "exact", head: true }).eq("sponsor_registration_id", id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SponsorPortalHeader id={id} company={sponsor.company_name} eventTitle={eventTitle} tierName={tierName} active="overview" />

      <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
        <FormSection title="Company profile" description="Shown to the organizer. Your tier and event can't be changed here.">
          {sponsor.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sponsor.logo_url} alt={`${sponsor.company_name} logo`} className="h-14 max-w-48 rounded-md object-contain" />
          )}
          <SponsorProfileForm id={id} companyName={sponsor.company_name} logoUrl={sponsor.logo_url} />
        </FormSection>

        <div className="space-y-3">
          <MetricCard label="Leads captured" value={count ?? 0} />
          <Link href={`/dashboard/sponsor/portal/${id}/scan`} className={cn(btnPrimary, "w-full")}><ScanLine aria-hidden /> Scan attendee</Link>
          <Link href={`/dashboard/sponsor/portal/${id}/leads`} className={cn(btnSecondary, "w-full")}>View leads</Link>
        </div>
      </div>
    </div>
  );
}
