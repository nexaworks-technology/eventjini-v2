"use server";

import { redirect } from "next/navigation";
import { UUID_RE } from "@/lib/registration";
import { createClient } from "@/utils/supabase/server";

export async function setEmailPreference(token: string, optOut: boolean) {
  if (UUID_RE.test(token)) {
    const supabase = await createClient();
    await supabase.rpc("set_email_opt_out", { p_token: token, p_opt_out: optOut });
  }
  redirect(`/unsubscribe/${token}`);
}
