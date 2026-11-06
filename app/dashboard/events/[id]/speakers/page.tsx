import { PageHeader } from "@/components/eventjini/page-header";
import { SpeakersManager } from "@/components/speakers-manager";
import { ADMIN_ROLES, requireEventAccess } from "@/lib/event-access";
import type { SpeakerRow } from "@/lib/speakers";

export default async function SpeakersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, role } = await requireEventAccess(id);

  const [{ data: speakerRows }, { data: links }] = await Promise.all([
    supabase.from("event_speakers").select("*").eq("event_id", id).order("is_featured", { ascending: false }).order("sort_order").order("name"),
    supabase.from("event_session_speakers").select("speaker_id").eq("event_id", id),
  ]);
  const sessionCounts: Record<string, number> = {};
  for (const l of links ?? []) sessionCounts[l.speaker_id] = (sessionCounts[l.speaker_id] ?? 0) + 1;

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader level={2} title="Speakers" description="Speaker profiles appear on your public event page and next to their sessions in the agenda." />
      <SpeakersManager
        eventId={id}
        speakers={(speakerRows ?? []) as SpeakerRow[]}
        sessionCounts={sessionCounts}
        canEdit={ADMIN_ROLES.includes(role)}
      />
    </div>
  );
}
