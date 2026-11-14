import { btnPrimary, btnSecondary } from "@/components/eventjini/classes";
import { cn } from "@/lib/utils";
import { createHash } from "node:crypto";
import Link from "next/link";
import { AuthLayout } from "@/components/eventjini/auth-layout";
import { AcceptInviteButton } from "@/components/accept-invite-button";
import { acceptOrgInvite } from "./actions";
import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/utils/supabase/server";

type Preview = { status: string; organization_name: string; role: string; email: string };

export default async function JoinOrganizationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = !!user && !user.is_anonymous;

  const valid = /^[A-Za-z0-9_-]{20,100}$/.test(token);
  const hash = valid ? createHash("sha256").update(token).digest("hex") : "";
  const { data } = valid ? await supabase.rpc("organization_invite_preview", { p_token_hash: hash }) : { data: null };
  const preview = data as Preview | null;

  const next = encodeURIComponent(`/join/${token}`);
  const role = preview ? preview.role.charAt(0).toUpperCase() + preview.role.slice(1) : "";

  let body: React.ReactNode;
  if (!preview) {
    body = <p className="text-center text-foreground">This invitation is not valid.</p>;
  } else if (preview.status !== "pending") {
    body = (
      <p className="text-center text-foreground">
        {preview.status === "accepted"
          ? "This invitation has already been used."
          : preview.status === "expired"
            ? "This invitation has expired. Ask an organization admin for a new one."
            : "This invitation is no longer valid."}
      </p>
    );
  } else if (!signedIn) {
    body = (
      <div className="space-y-3">
        <p className="text-center text-sm text-muted-foreground">
          Sign in or create an account with <span className="font-medium">{preview.email}</span> to accept.
        </p>
        <Link href={`/login?next=${next}`} className={cn(btnPrimary, "block text-center")}>
          Sign in
        </Link>
        <Link href={`/register?next=${next}`} className={cn(btnSecondary, "block text-center")}>
          Create account
        </Link>
      </div>
    );
  } else if ((user!.email ?? "").toLowerCase() !== preview.email.toLowerCase()) {
    body = (
      <div className="space-y-3 text-center">
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          This invitation was sent to a different email address than the account you&apos;re signed in with ({user!.email}).
        </p>
        <SignOutButton />
      </div>
    );
  } else {
    body = <AcceptInviteButton token={token} accept={acceptOrgInvite} />;
  }

  return (
    <AuthLayout
      title="Organization invitation"
      description={preview && preview.status === "pending" ? `You've been invited to join ${preview.organization_name} as ${role === "Admin" ? "an admin" : "a member"}.` : undefined}
    >
      {body}
    </AuthLayout>
  );
}
