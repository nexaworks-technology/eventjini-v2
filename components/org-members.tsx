"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  changeOrgMemberRole,
  createOrgInvite,
  removeOrgMember,
  resendOrgInvite,
  revokeOrgInvite,
  type InvitableRole,
} from "@/app/dashboard/org/members-actions";
import { btnPrimary, inputCls } from "@/components/eventjini/classes";
import { useConfirm } from "@/components/eventjini/confirm-dialog";
import { FormSection } from "@/components/eventjini/form-section";
import { buttonVariants } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ORG_ROLE_HELP, ORG_ROLE_LABELS, type OrgRole } from "@/lib/roles";

export type OrgMember = { member_id: string; user_id: string; email: string; full_name: string | null; role: OrgRole };
export type OrgInvite = { id: string; email: string; role: InvitableRole; expires_at: string; expired: boolean };

const INVITABLE: InvitableRole[] = ["admin", "member"];
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

function StatusPill({ tone, children }: { tone: "joined" | "invited" | "expired"; children: React.ReactNode }) {
  const cls = tone === "joined" ? "bg-success/10 text-success" : tone === "invited" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function OrgMembers({
  orgId,
  orgName,
  myUserId,
  canManage,
  members,
  invites,
}: {
  orgId: string;
  orgName: string;
  myUserId: string;
  canManage: boolean;
  members: OrgMember[];
  invites: OrgInvite[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("member");
  const [link, setLink] = useState<{ email: string; url: string; emailed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string; link?: string; emailed?: boolean }>, after?: (r: { link?: string; emailed?: boolean }) => void) {
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
    run(() => createOrgInvite(orgId, target, role), (r) => {
      if (r.link) setLink({ email: target, url: r.link, emailed: !!r.emailed });
      setEmail("");
    });
  }

  async function remove(m: OrgMember) {
    const self = m.user_id === myUserId;
    const ok = await confirm({
      title: self ? `Leave ${orgName}?` : `Remove ${m.email} from ${orgName}?`,
      description: self ? "You'll lose access to all of its events." : "They lose access to all of its events immediately.",
      confirmLabel: self ? "Leave" : "Remove",
      destructive: true,
    });
    if (!ok) return;
    run(() => removeOrgMember(m.member_id), () => {
      if (self) router.push("/dashboard/events");
    });
  }

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <FormSection title="Members" description="Everyone here can work on all of this organization's events.">
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
              {members.map((m) => {
                const self = m.user_id === myUserId;
                return (
                  <TableRow key={m.member_id}>
                    <TableCell className="max-w-64">
                      <p className="truncate font-medium">{m.full_name || m.email}{self && <span className="font-normal text-muted-foreground"> (you)</span>}</p>
                      {m.full_name && <p className="truncate text-xs text-muted-foreground">{m.email}</p>}
                    </TableCell>
                    <TableCell>
                      {m.role === "owner" || !canManage || self ? (
                        <span className="text-sm text-muted-foreground" title={ORG_ROLE_HELP[m.role]}>{ORG_ROLE_LABELS[m.role]}</span>
                      ) : (
                        <NativeSelect
                          size="sm"
                          value={m.role}
                          disabled={pending}
                          onChange={(e) => run(() => changeOrgMemberRole(orgId, m.member_id, e.target.value as InvitableRole))}
                          aria-label={`Role for ${m.email}`}
                        >
                          {INVITABLE.map((r) => <NativeSelectOption key={r} value={r}>{ORG_ROLE_LABELS[r]}</NativeSelectOption>)}
                        </NativeSelect>
                      )}
                    </TableCell>
                    <TableCell><StatusPill tone="joined">Joined</StatusPill></TableCell>
                    <TableCell className="text-right">
                      {m.role !== "owner" && (self || canManage) && (
                        <button type="button" disabled={pending} onClick={() => remove(m)} className={buttonVariants({ variant: "ghost", size: "sm", className: "text-destructive" })}>
                          {self ? "Leave" : "Remove"}
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {canManage && invites.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="max-w-64">
                    <p className="truncate font-medium">{i.email}</p>
                    <p className="text-xs text-muted-foreground">{i.expired ? "Link expired" : `Link expires ${dateFmt.format(new Date(i.expires_at))}`}</p>
                  </TableCell>
                  <TableCell><span className="text-sm text-muted-foreground">{ORG_ROLE_LABELS[i.role]}</span></TableCell>
                  <TableCell>{i.expired ? <StatusPill tone="expired">Expired</StatusPill> : <StatusPill tone="invited">Invited</StatusPill>}</TableCell>
                  <TableCell className="space-x-1 text-right whitespace-nowrap">
                    <button type="button" disabled={pending} onClick={() => run(() => resendOrgInvite(orgId, i.id), (r) => r.link && setLink({ email: i.email, url: r.link, emailed: !!r.emailed }))} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      Resend
                    </button>
                    <button type="button" disabled={pending} onClick={() => run(() => revokeOrgInvite(orgId, i.id))} className={buttonVariants({ variant: "ghost", size: "sm", className: "text-destructive" })}>
                      Revoke
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </FormSection>

      {canManage && (
        <FormSection title="Invite a member" description="We email them a link. It works only for that email address and expires after 7 days.">
          <form onSubmit={invite} className="flex flex-wrap items-end gap-3">
            <label className="min-w-56 flex-1 space-y-1 text-sm font-medium text-foreground">
              Email
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            </label>
            <label className="space-y-1 text-sm font-medium text-foreground">
              Role
              <NativeSelect value={role} onChange={(e) => setRole(e.target.value as InvitableRole)}>
                {INVITABLE.map((r) => <NativeSelectOption key={r} value={r}>{ORG_ROLE_LABELS[r]}</NativeSelectOption>)}
              </NativeSelect>
            </label>
            <button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Sending..." : "Send invite"}</button>
          </form>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Admin:</span> {ORG_ROLE_HELP.admin}{" "}
            <span className="font-medium text-foreground">Member:</span> {ORG_ROLE_HELP.member}
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
        </FormSection>
      )}
    </div>
  );
}
