import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrgRole } from "@/lib/roles";

export const ORG_COOKIE = "ej_org";
export const ORG_NAME_MAX = 80;

export type Organization = { id: string; name: string; logo_url: string | null; role: OrgRole };

/** The signed-in user's organizations, plus the one they're working in (cookie, else the first). */
export async function getOrganizations(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("organization_members")
    .select("role, organizations(id,name,logo_url)")
    .eq("user_id", userId);

  const orgs: Organization[] = (data ?? [])
    .flatMap((m) => {
      const o = m.organizations as unknown as { id: string; name: string; logo_url: string | null } | null;
      return o ? [{ ...o, role: m.role as OrgRole }] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const chosen = (await cookies()).get(ORG_COOKIE)?.value;
  const current = orgs.find((o) => o.id === chosen) ?? orgs[0] ?? null;
  return { orgs, current };
}
