import { TeamManager, type PendingInvite, type TeamMember } from "@/components/team-manager";
import { ADMIN_ROLES, requireEventAccess } from "@/lib/event-access";

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireEventAccess(id, ADMIN_ROLES);

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
    <div className="max-w-3xl space-y-6">
      <TeamManager
        eventId={id}
        members={(Array.isArray(team) ? team : []) as TeamMember[]}
        invites={(inviteRows ?? []) as PendingInvite[]}
      />
    </div>
  );
}
