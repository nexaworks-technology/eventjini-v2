import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/utils/supabase/server";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: "Google sign-in could not be completed. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error, next: nextParam } = await searchParams;
  const next = safeNext(nextParam);
  if (user && !user.is_anonymous) redirect(next ?? "/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-white p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <p className="text-sm font-semibold tracking-wide text-zinc-500">EventJini</p>
          <h1 className="text-2xl font-semibold text-zinc-900">Sign in</h1>
        </div>
        <AuthForm mode="login" next={next} initialError={error ? ERROR_MESSAGES[error] : undefined} />
      </div>
    </main>
  );
}
