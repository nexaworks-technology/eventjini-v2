"use server";

import { createHash, randomBytes } from "node:crypto";
import { sendOrgInviteEmail } from "@/lib/email/team-invite";
import { UUID_RE } from "@/lib/registration";
import { siteUrl } from "@/lib/site-url";
import { createClient } from "@/utils/supabase/server";

export type InvitableRole = "admin" | "member";
export type MembersResult = { ok: true; link?: string; emailed?: boolean } | { ok: false; error: string };

const ROLES: InvitableRole[] = ["admin", "member"];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Owners and admins only. The database re-checks every write. */
async function authorizeOrgAdmin(orgId: string) {
  if (!UUID_RE.test(orgId)) return { ok: false as const, error: "Organization not found." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return { ok: false as const, error: "Your session has expired. Please sign in again." };
  const { data } = await supabase.rpc("is_org_admin", { p_org_id: orgId });
  if (data !== true) return { ok: false as const, error: "Only owners and admins can manage members." };
  return { ok: true as const, supabase, userId: user.id };
}

export async function createOrgInvite(orgId: string, emailInput: string, role: InvitableRole): Promise<MembersResult> {
  const auth = await authorizeOrgAdmin(orgId);
  if (!auth.ok) return auth;
  const email = emailInput.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (!ROLES.includes(role)) return { ok: false, error: "Choose a valid role." };

  const { data: team } = await auth.supabase.rpc("organization_team", { p_org_id: orgId });
  if (Array.isArray(team) && team.some((m: { email: string }) => m.email?.toLowerCase() === email)) {
    return { ok: false, error: "That person is already a member." };
  }

  // Replace any earlier pending invite for the same address.
  await auth.supabase
    .from("organization_invites")
    .update({ status: "revoked" })
    .eq("organization_id", orgId)
    .eq("status", "pending")
    .ilike("email", email);

  const token = randomBytes(32).toString("base64url");
  const { error } = await auth.supabase.from("organization_invites").insert({
    organization_id: orgId,
    email,
    role,
    token_hash: createHash("sha256").update(token).digest("hex"),
    invited_by: auth.userId,
    expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
  });
  if (error) return { ok: false, error: "Could not create the invitation. Please try again." };

  const link = `${siteUrl()}/join/${token}`;
  const [{ data: org }, { data: profile }] = await Promise.all([
    auth.supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
    auth.supabase.from("profiles").select("full_name").eq("id", auth.userId).maybeSingle(),
  ]);
  const emailed = org
    ? await sendOrgInviteEmail({ to: email, link, role, inviterName: profile?.full_name?.trim() || "A teammate", orgName: org.name })
    : false;
  return { ok: true, link, emailed };
}

/** Issues a fresh link (the old one stops working) and emails it again. */
export async function resendOrgInvite(orgId: string, inviteId: string): Promise<MembersResult> {
  const auth = await authorizeOrgAdmin(orgId);
  if (!auth.ok) return auth;
  if (!UUID_RE.test(inviteId)) return { ok: false, error: "Invitation not found." };
  const { data } = await auth.supabase
    .from("organization_invites")
    .select("email,role")
    .eq("id", inviteId)
    .eq("organization_id", orgId)
    .eq("status", "pending")
    .maybeSingle();
  if (!data) return { ok: false, error: "Invitation not found." };
  return createOrgInvite(orgId, data.email, data.role as InvitableRole);
}

export async function revokeOrgInvite(orgId: string, inviteId: string): Promise<MembersResult> {
  const auth = await authorizeOrgAdmin(orgId);
  if (!auth.ok) return auth;
  if (!UUID_RE.test(inviteId)) return { ok: false, error: "Invitation not found." };
  const { data, error } = await auth.supabase
    .from("organization_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("organization_id", orgId)
    .eq("status", "pending")
    .select("id");
  if (error || !data?.length) return { ok: false, error: "Could not revoke the invitation." };
  return { ok: true };
}

export async function changeOrgMemberRole(orgId: string, memberId: string, role: InvitableRole): Promise<MembersResult> {
  const auth = await authorizeOrgAdmin(orgId);
  if (!auth.ok) return auth;
  if (!UUID_RE.test(memberId) || !ROLES.includes(role)) return { ok: false, error: "Invalid request." };
  const { error } = await auth.supabase.rpc("set_organization_member_role", { p_member_id: memberId, p_role: role });
  if (error?.message.includes("OWNER_IMMUTABLE")) return { ok: false, error: "The owner's role can't be changed." };
  if (error) return { ok: false, error: "Could not change the role." };
  return { ok: true };
}

/** Removes someone, or yourself (leaving). The owner can't be removed. */
export async function removeOrgMember(memberId: string): Promise<MembersResult> {
  if (!UUID_RE.test(memberId)) return { ok: false, error: "Member not found." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return { ok: false, error: "Your session has expired. Please sign in again." };
  const { error } = await supabase.rpc("remove_organization_member", { p_member_id: memberId });
  if (error?.message.includes("OWNER_IMMUTABLE")) return { ok: false, error: "The owner can't be removed." };
  if (error) return { ok: false, error: "Could not remove the member." };
  return { ok: true };
}
