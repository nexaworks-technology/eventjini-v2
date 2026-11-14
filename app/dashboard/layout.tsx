import type { ReactNode } from "react";
import { DashboardShell } from "@/components/eventjini/dashboard-shell";
import { getOrganizations } from "@/lib/organizations";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const account = user && !user.is_anonymous ? user : null;
  const { orgs, current } = account ? await getOrganizations(supabase, account.id) : { orgs: [], current: null };
  // Pages keep their own auth checks and redirects; the shell only displays the account and organization.
  return (
    <DashboardShell email={account?.email ?? null} orgs={orgs} currentOrg={current} signedIn={!!account}>
      {children}
    </DashboardShell>
  );
}
