"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ORG_COOKIE, ORG_NAME_MAX } from "@/lib/organizations";
import { UUID_RE } from "@/lib/registration";
import { createClient } from "@/utils/supabase/server";

export type OrgResult = { ok: true } | { ok: false; error: string };

const BUCKET = "event-assets";
const YEAR = 60 * 60 * 24 * 365;

async function rememberOrg(id: string) {
  (await cookies()).set(ORG_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: YEAR });
}

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user && !user.is_anonymous ? { supabase, user } : null;
}

export async function switchOrganization(orgId: string): Promise<OrgResult> {
  const s = await signedIn();
  if (!s) redirect("/login");
  if (!UUID_RE.test(orgId)) return { ok: false, error: "Organization not found." };
  const { data } = await s.supabase.rpc("is_org_member", { p_org_id: orgId });
  if (data !== true) return { ok: false, error: "You're not a member of that organization." };
  await rememberOrg(orgId);
  redirect("/dashboard/events");
}

export async function createOrganization(nameInput: string): Promise<OrgResult> {
  const s = await signedIn();
  if (!s) redirect("/login");
  const name = nameInput.trim();
  if (!name) return { ok: false, error: "Enter a name for your organization." };
  if (name.length > ORG_NAME_MAX) return { ok: false, error: `Names can be up to ${ORG_NAME_MAX} characters.` };

  const { data, error } = await s.supabase.rpc("create_organization", { p_name: name });
  if (error?.message.includes("ORG_LIMIT")) return { ok: false, error: "You can create up to 10 organizations." };
  if (error || typeof data !== "string") return { ok: false, error: "Could not create the organization. Please try again." };
  await rememberOrg(data);
  redirect("/dashboard/events");
}

export async function renameOrganization(orgId: string, nameInput: string): Promise<OrgResult> {
  const s = await signedIn();
  if (!s) return { ok: false, error: "Your session has expired. Please sign in again." };
  if (!UUID_RE.test(orgId)) return { ok: false, error: "Organization not found." };
  const name = nameInput.trim();
  if (!name) return { ok: false, error: "Enter a name." };
  if (name.length > ORG_NAME_MAX) return { ok: false, error: `Names can be up to ${ORG_NAME_MAX} characters.` };
  const { data, error } = await s.supabase.from("organizations").update({ name }).eq("id", orgId).select("id");
  if (error || !data?.length) return { ok: false, error: "Could not save. Only owners and admins can change the organization." };
  return { ok: true };
}

/** `path` is null to remove the logo. The upload itself happens in the browser (storage RLS checks it). */
export async function setOrganizationLogo(orgId: string, path: string | null): Promise<OrgResult> {
  const s = await signedIn();
  if (!s) return { ok: false, error: "Your session has expired. Please sign in again." };
  if (!UUID_RE.test(orgId)) return { ok: false, error: "Organization not found." };
  if (path !== null && !new RegExp(`^orgs/${orgId}/logo/[A-Za-z0-9][A-Za-z0-9._-]*\\.(jpg|jpeg|png|webp)$`).test(path)) {
    return { ok: false, error: "Invalid logo file." };
  }
  const url = path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}` : null;
  const { data, error } = await s.supabase.from("organizations").update({ logo_url: url }).eq("id", orgId).select("id");
  if (error || !data?.length) return { ok: false, error: "Could not update the logo." };
  return { ok: true };
}

export async function deleteOrganization(orgId: string): Promise<OrgResult> {
  const s = await signedIn();
  if (!s) return { ok: false, error: "Your session has expired. Please sign in again." };
  if (!UUID_RE.test(orgId)) return { ok: false, error: "Organization not found." };
  const { data, error } = await s.supabase.from("organizations").delete().eq("id", orgId).select("id");
  if (error?.code === "23503") return { ok: false, error: "This organization still has events, so it can't be deleted." };
  if (error || !data?.length) return { ok: false, error: "Only the owner can delete the organization." };
  (await cookies()).delete(ORG_COOKIE);
  redirect("/dashboard/events");
}
