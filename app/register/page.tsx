import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/utils/supabase/server";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const next = safeNext((await searchParams).next);
  if (user && !user.is_anonymous) redirect(next ?? "/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-white p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <p className="text-sm font-semibold tracking-wide text-zinc-500">EventJini</p>
          <h1 className="text-2xl font-semibold text-zinc-900">Create your account</h1>
        </div>
        <AuthForm mode="register" next={next} />
      </div>
    </main>
  );
}
