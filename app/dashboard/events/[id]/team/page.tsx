import { EventNav } from "@/components/event-nav";
import { TeamManager, type PendingInvite, type TeamMember } from "@/components/team-manager";
import { ADMIN_ROLES, requireEventAccess } from "@/lib/event-access";

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, event, role } = await requireEventAccess(id, ADMIN_ROLES);

  const [{ data: team }, { data: inviteRows }] = await Promise.all([
    supabase.rpc("event_team", { p_event_id: id }),
    supabase
      .from("event_invites")
      .select("id,email,role,expires_at")
      .eq("event_id", id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-6 px-4 py-10">
      <EventNav eventId={id} eventTitle={event.title} role={role} active="team" />
      <TeamManager
        eventId={id}
        members={(Array.isArray(team) ? team : []) as TeamMember[]}
        invites={(inviteRows ?? []) as PendingInvite[]}
      />
    </main>
  );
}
