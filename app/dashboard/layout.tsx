import type { ReactNode } from "react";
import { DashboardShell } from "@/components/eventjini/dashboard-shell";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Pages keep their own auth checks and redirects; the shell only displays the account.
  return <DashboardShell email={user && !user.is_anonymous ? (user.email ?? null) : null}>{children}</DashboardShell>;
}
