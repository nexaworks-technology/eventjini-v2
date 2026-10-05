import { AuthLayout } from "@/components/eventjini/auth-layout";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/utils/supabase/server";

export const metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const next = safeNext((await searchParams).next);
  if (user && !user.is_anonymous) redirect(next ?? "/dashboard");

  return (
    <AuthLayout title="Create your account" description="Start running your events from one place.">
      <AuthForm mode="register" next={next} />
    </AuthLayout>
  );
}
