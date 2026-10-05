import { CheckInScanner } from "@/components/checkin-scanner";
import { EventNav } from "@/components/event-nav";
import { CHECKIN_ROLES, requireEventAccess } from "@/lib/event-access";

export default async function CheckInPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event, role } = await requireEventAccess(id, CHECKIN_ROLES);

  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-6 px-4 py-10">
      <EventNav eventId={id} eventTitle={event.title} role={role} active="check-in" />
      <h2 className="text-xl font-semibold text-zinc-900">Check in guests</h2>
      <CheckInScanner eventId={id} />
    </main>
  );
}
