"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { ADMIN_ROLES, authorizeAction } from "@/lib/event-access";
import { UUID_RE } from "@/lib/registration";

export type MemberRole = "admin" | "scanner" | "viewer";
export type TeamResult = { ok: true; link?: string } | { ok: false; error: string };

const ROLES: MemberRole[] = ["admin", "scanner", "viewer"];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createInvite(eventId: string, emailInput: string, role: MemberRole): Promise<TeamResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };

  const email = emailInput.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (!ROLES.includes(role)) return { ok: false, error: "Choose a valid role." };

  // Replace any earlier pending invite for the same address.
  await auth.supabase
    .from("event_invites")
    .update({ status: "revoked" })
    .eq("event_id", eventId)
    .eq("status", "pending")
    .ilike("email", email);

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const { error } = await auth.supabase.from("event_invites").insert({
    event_id: eventId,
    email,
    role,
    token_hash: tokenHash,
    invited_by: auth.userId,
    expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
  });
  if (error) return { ok: false, error: "Could not create the invitation. Please try again." };

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return { ok: true, link: `${proto}://${host}/invite/${token}` };
}

export async function revokeInvite(eventId: string, inviteId: string): Promise<TeamResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!UUID_RE.test(inviteId)) return { ok: false, error: "Invitation not found." };

  const { data, error } = await auth.supabase
    .from("event_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("event_id", eventId)
    .eq("status", "pending")
    .select("id");
  if (error || !data || data.length === 0) return { ok: false, error: "Could not revoke the invitation." };
  return { ok: true };
}

export async function changeMemberRole(eventId: string, memberId: string, role: MemberRole): Promise<TeamResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!UUID_RE.test(memberId) || !ROLES.includes(role)) return { ok: false, error: "Invalid request." };

  const { data, error } = await auth.supabase
    .from("event_members")
    .update({ role })
    .eq("id", memberId)
    .eq("event_id", eventId)
    .select("id");
  if (error || !data || data.length === 0) return { ok: false, error: "Could not change the role." };
  return { ok: true };
}

export async function removeMember(eventId: string, memberId: string): Promise<TeamResult> {
  const auth = await authorizeAction(eventId, ADMIN_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!UUID_RE.test(memberId)) return { ok: false, error: "Member not found." };

  const { data, error } = await auth.supabase
    .from("event_members")
    .delete()
    .eq("id", memberId)
    .eq("event_id", eventId)
    .select("id");
  if (error || !data || data.length === 0) return { ok: false, error: "Could not remove the member." };
  return { ok: true };
}
