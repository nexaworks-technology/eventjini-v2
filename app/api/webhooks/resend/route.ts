import { NextResponse } from "next/server";
import { getResend } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });

  const payload = await request.text();
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!id || !timestamp || !signature) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

  let event: { type: string; created_at?: string; data?: { email_id?: string } };
  try {
    event = getResend().webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret: secret,
    }) as unknown as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const emailId = event.data?.email_id;
  if (!event.type.startsWith("email.") || !emailId) return NextResponse.json({ ok: true, ignored: true });

  const { data, error } = await createAdminClient().rpc("apply_email_event", {
    p_provider_message_id: emailId,
    p_event: event.type,
    p_at: event.created_at ?? new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: "Could not record event" }, { status: 500 });
  return NextResponse.json({ ok: true, result: data });
}
