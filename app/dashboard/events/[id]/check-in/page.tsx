import { PageHeader } from "@/components/eventjini/page-header";
import { InstallButton } from "@/components/install-button";
import { CheckInScanner } from "@/components/checkin-scanner";
import { CHECKIN_ROLES, requireEventAccess } from "@/lib/event-access";

export default async function CheckInPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const {  } = await requireEventAccess(id, CHECKIN_ROLES);

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader level={2} title={"Check in guests"} />
        <InstallButton label="Install scanner" />
      </div>
      <CheckInScanner eventId={id} />
    </div>
  );
}
