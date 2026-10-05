import { NextResponse } from "next/server";
import { rejectUnlessCron } from "@/lib/cron-auth";
import { processEmailQueue } from "@/lib/email/worker";

export const maxDuration = 60;

async function run(request: Request) {
  const denied = rejectUnlessCron(request);
  if (denied) return denied;

  let claimed = 0, sent = 0, failed = 0;
  for (let i = 0; i < 4; i++) {
    const r = await processEmailQueue(50);
    if (!r.ok) return NextResponse.json({ ok: false, reason: r.reason }, { status: r.reason === "not_configured" ? 503 : 500 });
    claimed += r.claimed;
    sent += r.sent;
    failed += r.failed;
    if (r.claimed < 50) break;
  }
  return NextResponse.json({ ok: true, claimed, sent, failed });
}

export const GET = run;
export const POST = run;
