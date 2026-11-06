"use client";

import { buttonVariants } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useConfirm } from "@/components/eventjini/confirm-dialog";
import { btnPrimary } from "@/components/eventjini/classes";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  changeMemberRole,
  createInvite,
  removeMember,
  resendInvite,
  revokeInvite,
  type MemberRole,
} from "@/app/dashboard/events/[id]/team/actions";

export type TeamMember = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: "owner" | MemberRole;
  is_owner: boolean;
  member_id: string | null;
};
export type PendingInvite = { id: string; email: string; role: MemberRole; expires_at: string; expired: boolean };

const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "scanner", label: "Scanner" },
  { value: "viewer", label: "Viewer" },
];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

function StatusPill({ tone, children }: { tone: "joined" | "invited" | "expired"; children: React.ReactNode }) {
  const cls =
    tone === "joined" ? "bg-success/10 text-success" : tone === "invited" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function TeamManager({
  eventId,
  members,
  invites,
}: {
  eventId: string;
  members: TeamMember[];
  invites: PendingInvite[];
}) {
  const confirm = useConfirm();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("admin");
  const [link, setLink] = useState<{ email: string; url: string; emailed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(
    fn: () => Promise<{ ok: boolean; error?: string; link?: string; emailed?: boolean }>,
    after?: (r: { link?: string; emailed?: boolean }) => void
  ) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Something went wrong.");
      else after?.(r);
      router.refresh();
    });
  }

  function invite(e: FormEvent) {
    e.preventDefault();
    const target = email.trim();
    run(
      () => createInvite(eventId, target, role),
      (r) => {
        if (r.link) setLink({ email: target, url: r.link, emailed: !!r.emailed });
        setEmail("");
      }
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <section className="space-y-3 rounded-xl bg-card p-6 shadow-sm">
        <h2 className="font-semibold text-foreground">Team</h2>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.user_id}>
                  <TableCell className="max-w-64">
                    <p className="truncate font-medium">{m.full_name || m.email}</p>
                    {m.full_name && <p className="truncate text-xs text-muted-foreground">{m.email}</p>}
                  </TableCell>
                  <TableCell>
                    {m.is_owner ? (
                      <span className="text-sm text-muted-foreground">Owner</span>
                    ) : (
                      <NativeSelect
                        size="sm"
                        value={m.role}
                        disabled={pending}
                        onChange={(e) => run(() => changeMemberRole(eventId, m.member_id!, e.target.value as MemberRole))}
                        aria-label={`Role for ${m.email}`}
                      >
                        {ROLE_OPTIONS.map((o) => (
                          <NativeSelectOption key={o.value} value={o.value}>{o.label}</NativeSelectOption>
                        ))}
                      </NativeSelect>
                    )}
                  </TableCell>
                  <TableCell><StatusPill tone="joined">Joined</StatusPill></TableCell>
                  <TableCell className="text-right">
                    {!m.is_owner && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={async () => {
                          if (await confirm({ title: `Remove ${m.email} from this event?`, description: "They lose access immediately. Their past actions stay in the record.", confirmLabel: "Remove", destructive: true })) run(() => removeMember(eventId, m.member_id!));
                        }}
                        className={buttonVariants({ variant: "ghost", size: "sm", className: "text-destructive" })}
                      >
                        Remove
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {invites.map((i) => {
                const { expired } = i;
                return (
                  <TableRow key={i.id}>
                    <TableCell className="max-w-64">
                      <p className="truncate font-medium">{i.email}</p>
                      <p className="text-xs text-muted-foreground">{expired ? "Link expired" : `Link expires ${dateFmt.format(new Date(i.expires_at))}`}</p>
                    </TableCell>
                    <TableCell><span className="text-sm text-muted-foreground">{cap(i.role)}</span></TableCell>
                    <TableCell>{expired ? <StatusPill tone="expired">Expired</StatusPill> : <StatusPill tone="invited">Invited</StatusPill>}</TableCell>
                    <TableCell className="space-x-1 text-right whitespace-nowrap">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => resendInvite(eventId, i.id), (r) => r.link && setLink({ email: i.email, url: r.link, emailed: !!r.emailed }))}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        Resend
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => revokeInvite(eventId, i.id))}
                        className={buttonVariants({ variant: "ghost", size: "sm", className: "text-destructive" })}
                      >
                        Revoke
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3 rounded-xl bg-card p-6 shadow-sm">
        <h2 className="font-semibold text-foreground">Invite team member</h2>
        <form onSubmit={invite} className="flex flex-wrap items-end gap-3">
          <label className="min-w-56 flex-1 space-y-1 text-sm text-foreground">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 focus:border-ring focus:outline-none"
            />
          </label>
          <label className="space-y-1 text-sm text-foreground">
            Role
            <select value={role} onChange={(e) => setRole(e.target.value as MemberRole)} className="block rounded-md border border-border px-3 py-2">
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? "Sending..." : "Send invite"}
          </button>
        </form>
        <p className="text-xs text-muted-foreground">
          We email the invitee a link to join. It works only for that email address and expires after 7 days.
        </p>

        {link && (
          <div className={`space-y-1 rounded-md px-3 py-3 text-sm ${link.emailed ? "bg-success/10 text-success" : "bg-warning/10 text-foreground"}`}>
            <p>
              {link.emailed ? (
                <>Invitation emailed to <span className="font-medium">{link.email}</span>. You can also share this link directly (shown only once):</>
              ) : (
                <>We couldn&apos;t email <span className="font-medium">{link.email}</span>. Copy this link and send it yourself (shown only once):</>
              )}
            </p>
            <input readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} className="w-full rounded border border-border bg-card px-2 py-1 font-mono text-xs text-foreground" />
          </div>
        )}
      </section>
    </div>
  );
}
