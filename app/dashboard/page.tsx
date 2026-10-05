import { CalendarDays, Ticket } from "lucide-react";
import Link from "next/link";
import { PageHeader, SectionTitle } from "@/components/eventjini/page-header";
import { redirect } from "next/navigation";
import { InstallButton } from "@/components/install-button";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/login");

  const { data: portalData } = await supabase.rpc("my_sponsor_portals");
  const portals = (Array.isArray(portalData) ? portalData : []) as { id: string; company_name: string; event_title: string; tier_name: string; claimed: boolean }[];

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={profile?.full_name ? `Welcome, ${profile.full_name}` : "Welcome"}
        description={<>Signed in as <span className="font-medium text-foreground">{user.email}</span></>}
        actions={<InstallButton />}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/dashboard/events" className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/40">
          <CalendarDays className="size-5 text-primary" aria-hidden />
          <p className="mt-2 font-medium">Your events</p>
          <p className="text-sm text-muted-foreground">Create, run and measure your events.</p>
        </Link>
        <Link href="/my-tickets" className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/40">
          <Ticket className="size-5 text-primary" aria-hidden />
          <p className="mt-2 font-medium">My Tickets</p>
          <p className="text-sm text-muted-foreground">Events you&apos;re attending.</p>
        </Link>
      </div>

      {portals.length > 0 && (
        <section className="space-y-3">
          <SectionTitle description="Portals for sponsorships approved under your email.">Sponsor portals</SectionTitle>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {portals.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div className="min-w-0">
                  <Link href={`/dashboard/sponsor/portal/${p.id}`} className="font-medium hover:underline">{p.company_name}</Link>
                  <p className="text-sm text-muted-foreground">{p.event_title} · {p.tier_name}</p>
                </div>
                {!p.claimed && <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">Claim pending</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
