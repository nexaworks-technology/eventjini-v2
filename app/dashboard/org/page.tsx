import { redirect } from "next/navigation";
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

  const { count } = await supabase.from("events").select("id", { count: "exact", head: true }).eq("organization_id", current.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={current.name} description={<>Organization settings · Your role: {ORG_ROLE_LABELS[current.role]}</>} />
      <OrgSettings org={current} eventCount={count ?? 0} />
    </div>
  );
}
