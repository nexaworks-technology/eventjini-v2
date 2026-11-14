import { TeamManager, type PendingInvite, type TeamMember } from "@/components/team-manager";
import Link from "next/link";
import { ADMIN_ROLES, requireEventAccess } from "@/lib/event-access";

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, event } = await requireEventAccess(id, ADMIN_ROLES);

  const now = new Date();
  const [{ data: team }, { data: inviteRows }, { data: org }] = await Promise.all([
    supabase.rpc("event_team", { p_event_id: id }),
    supabase
      .from("event_invites")
      .select("id,email,role,expires_at")
      .eq("event_id", id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase.from("organizations").select("name").eq("id", event.organization_id).maybeSingle(),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      {org && (
        <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Everyone in <span className="font-medium text-foreground">{org.name}</span> already has access to this event.
          Add people here only for this event, such as check-in volunteers.{" "}
          <Link href="/dashboard/org" className="underline hover:text-foreground">Organization members</Link>
        </p>
      )}
      <TeamManager
        eventId={id}
        members={(Array.isArray(team) ? team : []) as TeamMember[]}
        invites={(inviteRows ?? []).map((i) => ({ ...i, expired: new Date(i.expires_at) <= now })) as PendingInvite[]}
      />
    </div>
  );
}
