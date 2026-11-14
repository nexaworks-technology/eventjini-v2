import { redirect } from "next/navigation";
import { PageHeader } from "@/components/eventjini/page-header";
import { ProfileForm } from "@/components/profile-form";
import { createClient } from "@/utils/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/login?next=/dashboard/profile");

  const { data: profile } = await supabase.from("profiles").select("full_name,job_title,company_size").eq("id", user.id).maybeSingle();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader title="Your profile" description="Shown to teammates in your organizations and event teams." />
      <ProfileForm
        email={user.email ?? ""}
        initial={{ fullName: profile?.full_name ?? "", jobTitle: profile?.job_title ?? "", companySize: profile?.company_size ?? "" }}
      />
    </div>
  );
}
