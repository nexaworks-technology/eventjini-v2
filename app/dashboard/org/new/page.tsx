import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateOrgForm } from "@/components/create-org-form";
import { PageHeader } from "@/components/eventjini/page-header";
import { getOrganizations } from "@/lib/organizations";
import { createClient } from "@/utils/supabase/server";

export default async function NewOrganizationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/login?next=/dashboard/org/new");
  const { orgs } = await getOrganizations(supabase, user.id);
  const first = orgs.length === 0;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {!first && (
        <Link href="/dashboard/events" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" aria-hidden /> Events
        </Link>
      )}
      <PageHeader
        title={first ? "Welcome to EventJini" : "New organization"}
        description={
          first
            ? "First, create your organization. Your events and team live inside it, and you can create or join more organizations later."
            : "Each organization has its own events and members. Switch between them from the top bar."
        }
      />
      <div className="rounded-xl border bg-card p-5">
        <CreateOrgForm />
      </div>
    </div>
  );
}
