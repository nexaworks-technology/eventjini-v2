import { createHash } from "node:crypto";
import Link from "next/link";
import { AcceptInviteButton } from "@/components/accept-invite-button";
import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/utils/supabase/server";

type Preview = { status: string; event_title: string; role: string; email: string };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = !!user && !user.is_anonymous;

  const valid = /^[A-Za-z0-9_-]{20,100}$/.test(token);
  const hash = valid ? createHash("sha256").update(token).digest("hex") : "";
  const { data } = valid ? await supabase.rpc("invite_preview", { p_token_hash: hash }) : { data: null };
  const preview = data as Preview | null;

  const next = encodeURIComponent(`/invite/${token}`);
  const role = preview ? preview.role.charAt(0).toUpperCase() + preview.role.slice(1) : "";

  let body: React.ReactNode;
  if (!preview) {
    body = <p className="text-center text-zinc-700">This invitation is not valid.</p>;
  } else if (preview.status !== "pending") {
    body = (
      <p className="text-center text-zinc-700">
        {preview.status === "accepted"
          ? "This invitation has already been used."
          : preview.status === "expired"
            ? "This invitation has expired. Ask the organizer for a new one."
            : "This invitation is no longer valid."}
      </p>
    );
  } else if (!signedIn) {
    body = (
      <div className="space-y-3">
        <p className="text-center text-sm text-zinc-600">
          Sign in or create an account with <span className="font-medium">{preview.email}</span> to accept.
        </p>
        <Link href={`/login?next=${next}`} className="block rounded-md bg-zinc-900 px-4 py-2 text-center font-medium text-white hover:bg-zinc-700">
          Sign in
        </Link>
        <Link href={`/register?next=${next}`} className="block rounded-md border border-zinc-300 px-4 py-2 text-center font-medium text-zinc-900 hover:bg-zinc-50">
          Create account
        </Link>
      </div>
    );
  } else if ((user!.email ?? "").toLowerCase() !== preview.email.toLowerCase()) {
    body = (
      <div className="space-y-3 text-center">
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          This invitation was sent to a different email address than the account you&apos;re signed in with ({user!.email}).
        </p>
        <SignOutButton />
      </div>
    );
  } else {
    body = <AcceptInviteButton token={token} />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm space-y-5 rounded-xl bg-white p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <p className="text-sm font-semibold tracking-wide text-zinc-500">EventJini</p>
          <h1 className="text-xl font-semibold text-zinc-900">Team invitation</h1>
          {preview && preview.status === "pending" && (
            <p className="text-sm text-zinc-600">
              You&apos;ve been invited to <span className="font-medium">{preview.event_title}</span> as {role}.
            </p>
          )}
        </div>
        {body}
      </div>
    </main>
  );
}
