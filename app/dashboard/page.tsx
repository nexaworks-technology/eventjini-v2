import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
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
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold tracking-wide text-zinc-500">EventJini</p>
        <div className="space-y-2">
          {profile?.full_name && (
            <h1 className="text-2xl font-semibold text-zinc-900">Welcome, {profile.full_name}</h1>
          )}
          <p className="text-sm text-zinc-600">You&apos;re signed in as:</p>
          <p className="break-all font-medium text-zinc-900">{user.email}</p>
        </div>
        <Link
          href="/dashboard/events"
          className="block rounded-md bg-zinc-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-zinc-700"
        >
          Your events
        </Link>
        {portals.length > 0 && (
          <div className="space-y-2 rounded-md border border-zinc-200 p-3">
            <p className="text-sm font-medium text-zinc-900">Sponsor portals</p>
            <ul className="space-y-1 text-sm">
              {portals.map((p) => (
                <li key={p.id}>
                  <Link href={`/dashboard/sponsor/portal/${p.id}`} className="underline">
                    {p.company_name} · {p.event_title}
                  </Link>
                  <span className="text-zinc-500"> ({p.tier_name}{p.claimed ? "" : ", claim pending"})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <SignOutButton />
      </div>
    </main>
  );
}
