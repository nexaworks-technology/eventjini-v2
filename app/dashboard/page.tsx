import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold tracking-wide text-zinc-500">EventJini</p>
        <div className="space-y-2">
          {profile?.full_name && (
            <h1 className="text-2xl font-semibold text-zinc-900">Welcome, {profile.full_name}</h1>
          )}
          <p className="text-sm text-zinc-600">You&apos;re signed in as:</p>
          <p className="break-all font-medium text-zinc-900">{user.email}</p>
        </div>
        <SignOutButton />
      </div>
    </main>
  );
}
