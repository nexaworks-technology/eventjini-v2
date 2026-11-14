"use server";

import { COMPANY_SIZES, PROFILE_TEXT_MAX } from "@/lib/profile";
import { createClient } from "@/utils/supabase/server";

export type ProfileInput = { fullName: string; jobTitle: string; companySize: string };
export type ProfileResult = { ok: true } | { ok: false; error: string };

export async function saveProfile(input: ProfileInput): Promise<ProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return { ok: false, error: "Your session has expired. Please sign in again." };

  const fullName = input.fullName.trim();
  const jobTitle = input.jobTitle.trim();
  if (!fullName) return { ok: false, error: "Enter your name." };
  if (fullName.length > PROFILE_TEXT_MAX || jobTitle.length > PROFILE_TEXT_MAX) return { ok: false, error: `Keep each field under ${PROFILE_TEXT_MAX} characters.` };
  if (input.companySize && !(COMPANY_SIZES as readonly string[]).includes(input.companySize)) return { ok: false, error: "Choose a company size from the list." };

  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, job_title: jobTitle || null, company_size: input.companySize || null })
    .eq("id", user.id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "Could not save your profile. Please try again." };
  return { ok: true };
}
