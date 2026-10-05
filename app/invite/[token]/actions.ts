"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type AcceptResult = { ok: false; error: string };

export async function acceptInvite(token: string): Promise<AcceptResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return { ok: false, error: "Please sign in to accept this invitation." };

  const hash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await supabase.rpc("accept_event_invite", { p_token_hash: hash });

  if (error || !data) {
    const m = error?.message ?? "";
    if (m.includes("EMAIL_MISMATCH"))
      return { ok: false, error: "This invitation was sent to a different email address. Sign in with the invited account." };
    if (m.includes("ALREADY_OWNER")) return { ok: false, error: "You already own this event." };
    if (m.includes("INVITE_EXPIRED")) return { ok: false, error: "This invitation has expired. Ask for a new one." };
    if (m.includes("INVITE_USED")) return { ok: false, error: "This invitation has already been used." };
    if (m.includes("INVITE_INVALID")) return { ok: false, error: "This invitation is no longer valid." };
    return { ok: false, error: "Could not accept the invitation. Please try again." };
  }

  redirect(`/dashboard/events/${(data as { event_id: string }).event_id}`);
}
