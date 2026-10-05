import { AuthLayout } from "@/components/eventjini/auth-layout";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/utils/supabase/server";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: "Google sign-in could not be completed. Please try again.",
};

export const metadata = { title: "Sign in" };

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
    <AuthLayout title="Welcome back" description="Sign in to your EventJini workspace.">
      <AuthForm mode="login" next={next} initialError={error ? ERROR_MESSAGES[error] : undefined} />
    </AuthLayout>
  );
}
