"use server";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ORG_COOKIE } from "@/lib/organizations";
import { createClient } from "@/utils/supabase/server";

export type AcceptResult = { ok: false; error: string };

export async function acceptOrgInvite(token: string): Promise<AcceptResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return { ok: false, error: "Please sign in to accept this invitation." };

  const hash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await supabase.rpc("accept_organization_invite", { p_token_hash: hash });

  if (error || !data) {
    const m = error?.message ?? "";
    if (m.includes("EMAIL_MISMATCH"))
      return { ok: false, error: "This invitation was sent to a different email address. Sign in with the invited account." };
    if (m.includes("INVITE_EXPIRED")) return { ok: false, error: "This invitation has expired. Ask for a new one." };
    if (m.includes("INVITE_USED")) return { ok: false, error: "This invitation has already been used." };
    if (m.includes("INVITE_INVALID")) return { ok: false, error: "This invitation is no longer valid." };
    return { ok: false, error: "Could not accept the invitation. Please try again." };
  }

  // Open the organization they just joined.
  const orgId = (data as { organization_id: string }).organization_id;
  (await cookies()).set(ORG_COOKIE, orgId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/dashboard/events");
}
