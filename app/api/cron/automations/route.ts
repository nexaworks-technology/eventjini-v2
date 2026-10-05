import { NextResponse } from "next/server";
import { rejectUnlessCron } from "@/lib/cron-auth";
import { processEmailQueue } from "@/lib/email/worker";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

async function run(request: Request) {
  const denied = rejectUnlessCron(request);
  if (denied) return denied;

  const { data, error } = await createAdminClient().rpc("queue_event_reminders");
  if (error) return NextResponse.json({ ok: false }, { status: 500 });

  const queued = typeof data === "number" ? data : 0;
  const sending = await processEmailQueue(50);
  return NextResponse.json({ ok: true, queued, sending: sending.ok ? { sent: sending.sent, failed: sending.failed } : sending.reason });
}

export const GET = run;
export const POST = run;
