import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/eventjini/page-header";
import { redirect } from "next/navigation";
import { EventWizard } from "@/components/event-wizard";
import { emptyFormValues } from "@/lib/events";
import { getTimezones } from "@/lib/time";
import { createClient } from "@/utils/supabase/server";

export default async function NewEventPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <Link href="/dashboard/events" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" aria-hidden /> Events
        </Link>
        <PageHeader title="Create event" description="Four short steps: basics, date and time, settings, and a final review." />
      </div>
      <EventWizard mode="create" initialValues={emptyFormValues()} timezones={getTimezones()} />
    </div>
  );
}
