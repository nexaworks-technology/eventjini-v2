import { AuthLayout } from "@/components/eventjini/auth-layout";
import { btnPrimary, btnSecondary } from "@/components/eventjini/classes";
import { UUID_RE } from "@/lib/registration";
import { createClient } from "@/utils/supabase/server";
import { setEmailPreference } from "./actions";

export const metadata = { title: "Email preferences", robots: { index: false } };

type Preview = { event_title: string; opted_out: boolean };

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let preview: Preview | null = null;
  if (UUID_RE.test(token)) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("unsubscribe_preview", { p_token: token });
    preview = (data as Preview | null) ?? null;
  }

  if (!preview) {
    return (
      <AuthLayout title="Email preferences">
        <p className="text-center text-foreground">This link is not valid.</p>
      </AuthLayout>
    );
  }

  const optOut = !preview.opted_out;
  return (
    <AuthLayout
      title={preview.opted_out ? "You're unsubscribed" : "Unsubscribe from updates"}
      description={
        preview.opted_out
          ? `You won't receive further announcements from ${preview.event_title}. Messages about your own registration, such as your ticket and reminders, may still be sent.`
          : `Stop receiving announcements from ${preview.event_title}? Messages about your own registration, such as your ticket and reminders, may still be sent.`
      }
    >
      <form action={setEmailPreference.bind(null, token, optOut)}>
        <button type="submit" className={preview.opted_out ? btnSecondary : btnPrimary + " w-full"}>
          {preview.opted_out ? "Resubscribe" : "Unsubscribe"}
        </button>
      </form>
    </AuthLayout>
  );
}
