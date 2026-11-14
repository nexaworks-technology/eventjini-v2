import { redirect } from "next/navigation";
import { OrgMembers, type OrgInvite, type OrgMember } from "@/components/org-members";
import { OrgSettings } from "@/components/org-settings";
import { PageHeader } from "@/components/eventjini/page-header";
import { getOrganizations } from "@/lib/organizations";
import { ORG_ROLE_LABELS } from "@/lib/roles";
import { createClient } from "@/utils/supabase/server";

export default async function OrganizationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/login?next=/dashboard/org");
  const { current } = await getOrganizations(supabase, user.id);
  if (!current) redirect("/dashboard/org/new");

  const canManage = current.role === "owner" || current.role === "admin";
  const now = new Date();
  const [{ count }, { data: team }, { data: inviteRows }] = await Promise.all([
    supabase.from("events").select("id", { count: "exact", head: true }).eq("organization_id", current.id),
    supabase.rpc("organization_team", { p_org_id: current.id }),
    canManage
      ? supabase
          .from("organization_invites")
          .select("id,email,role,expires_at")
          .eq("organization_id", current.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={current.name} description={<>Organization settings · Your role: {ORG_ROLE_LABELS[current.role]}</>} />
      <OrgMembers
        orgId={current.id}
        orgName={current.name}
        myUserId={user.id}
        canManage={canManage}
        members={(Array.isArray(team) ? team : []) as OrgMember[]}
        invites={((inviteRows ?? []) as Omit<OrgInvite, "expired">[]).map((i) => ({ ...i, expired: new Date(i.expires_at) <= now }))}
      />
      <OrgSettings org={current} eventCount={count ?? 0} />
    </div>
  );
}
