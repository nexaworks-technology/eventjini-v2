import Link from "next/link";
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
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen space-y-6 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/events" className="text-sm text-zinc-500 hover:underline">
          ← Your events
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">Create event</h1>
      </div>
      <EventWizard mode="create" initialValues={emptyFormValues()} timezones={getTimezones()} />
    </main>
  );
}
