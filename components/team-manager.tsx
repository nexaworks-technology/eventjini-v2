"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  changeMemberRole,
  createInvite,
  removeMember,
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
export type PendingInvite = { id: string; email: string; role: MemberRole; expires_at: string };

const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "scanner", label: "Scanner" },
  { value: "viewer", label: "Viewer" },
];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function TeamManager({
  eventId,
  members,
  invites,
}: {
  eventId: string;
  members: TeamMember[];
  invites: PendingInvite[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("admin");
  const [link, setLink] = useState<{ email: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string; link?: string }>, after?: (r: { link?: string }) => void) {
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
        if (r.link) setLink({ email: target, url: r.link });
        setEmail("");
      }
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="space-y-3 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-zinc-900">Team</h2>
        <ul className="divide-y divide-zinc-100">
          {members.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-900">{m.full_name || m.email}</p>
                {m.full_name && <p className="text-xs text-zinc-500">{m.email}</p>}
              </div>
              {m.is_owner ? (
                <span className="text-sm text-zinc-600">Owner</span>
              ) : (
                <div className="flex items-center gap-3">
                  <select
                    value={m.role}
                    disabled={pending}
                    onChange={(e) => run(() => changeMemberRole(eventId, m.member_id!, e.target.value as MemberRole))}
                    aria-label={`Role for ${m.email}`}
                    className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
                  >
                    {ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(`Remove ${m.email} from this event?`)) run(() => removeMember(eventId, m.member_id!));
                    }}
                    className="text-sm text-red-600 underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {invites.length > 0 && (
        <section className="space-y-3 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-zinc-900">Pending invitations</h2>
          <ul className="divide-y divide-zinc-100">
            {invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="font-medium text-zinc-900">{i.email}</span>{" "}
                  <span className="text-zinc-600">· {cap(i.role)} · pending</span>
                </span>
                <button type="button" disabled={pending} onClick={() => run(() => revokeInvite(eventId, i.id))} className="text-red-600 underline">
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-zinc-900">Invite team member</h2>
        <form onSubmit={invite} className="flex flex-wrap items-end gap-3">
          <label className="min-w-56 flex-1 space-y-1 text-sm text-zinc-700">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 focus:border-zinc-900 focus:outline-none"
            />
          </label>
          <label className="space-y-1 text-sm text-zinc-700">
            Role
            <select value={role} onChange={(e) => setRole(e.target.value as MemberRole)} className="block rounded-md border border-zinc-300 px-3 py-2">
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={pending} className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60">
            {pending ? "Creating..." : "Create invite"}
          </button>
        </form>
        <p className="text-xs text-zinc-500">
          EventJini does not send email yet. Copy the invitation link and send it to the invitee. Links expire after 7 days.
        </p>

        {link && (
          <div className="space-y-1 rounded-md bg-green-50 px-3 py-3 text-sm text-green-900">
            <p>
              Invitation for <span className="font-medium">{link.email}</span> created. This link is shown only once:
            </p>
            <input readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} className="w-full rounded border border-green-200 bg-white px-2 py-1 font-mono text-xs text-zinc-900" />
          </div>
        )}
      </section>
    </div>
  );
}
