import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailConfigured, fromAddress, getResend } from "@/lib/email/resend";
import { formatEventWhen } from "@/lib/time";
import { renderHtml, renderTemplate } from "@/lib/email/template";

type Claimed = {
  id: string;
  recipient_email: string;
  subject: string;
  body_text: string;
  first_name: string;
  event_title: string;
  event_start_at: string;
  event_end_at: string;
  event_timezone: string;
  event_location: string | null;
};

export type QueueResult =
  | { ok: true; claimed: number; sent: number; failed: number }
  | { ok: false; reason: "not_configured" | "error" };

const CHUNK = 50;

function safeMessage(e: unknown): string {
  const m = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";
  return m.replace(/re_[A-Za-z0-9_]+/g, "[redacted]").slice(0, 200);
}

/** Claims due deliveries, sends them through Resend (server-side only) and records the outcome. */
export async function processEmailQueue(limit = 50): Promise<QueueResult> {
  if (!emailConfigured()) return { ok: false, reason: "not_configured" };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_email_deliveries", { p_limit: limit });
  if (error || !Array.isArray(data)) return { ok: false, reason: "error" };
  const rows = data as Claimed[];

  let sent = 0;
  let failed = 0;
  const resend = getResend();
  const from = fromAddress();

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const payload = chunk.map((r) => {
      const when = formatEventWhen(r.event_start_at, r.event_end_at, r.event_timezone);
      const vars = {
        first_name: r.first_name,
        event_title: r.event_title,
        event_date: `${when.date}, ${when.time} (${r.event_timezone})`,
        event_location: r.event_location ?? "",
      };
      const text = renderTemplate(r.body_text, vars);
      return {
        from,
        to: [r.recipient_email],
        subject: renderTemplate(r.subject, vars),
        text,
        html: renderHtml(text, r.event_title),
      };
    });

    const outcomes: { id: string; providerId: string | null; error: string | null }[] = [];
    try {
      const idempotencyKey = `ej-${createHash("sha256").update(chunk.map((c) => c.id).join(",")).digest("hex").slice(0, 40)}`;
      const res = await resend.batch.send(payload, { batchValidation: "permissive", idempotencyKey });
      if (res.error || !res.data) {
        for (const r of chunk) outcomes.push({ id: r.id, providerId: null, error: safeMessage(res.error?.message ?? "Provider error") });
      } else {
        const failedAt = new Map<number, string>();
        const errs = (res.data as { errors?: { index: number; message: string }[] }).errors ?? [];
        for (const e of errs) failedAt.set(e.index, e.message);
        const ids = res.data.data ?? [];
        let k = 0;
        chunk.forEach((r, idx) => {
          if (failedAt.has(idx)) outcomes.push({ id: r.id, providerId: null, error: safeMessage(failedAt.get(idx)) });
          else outcomes.push({ id: r.id, providerId: ids[k++]?.id ?? null, error: ids[k - 1] ? null : "Provider returned no message id" });
        });
      }
    } catch (e) {
      for (const r of chunk) outcomes.push({ id: r.id, providerId: null, error: safeMessage(e) });
    }

    for (const o of outcomes) {
      await admin.rpc("finish_email_delivery", {
        p_id: o.id,
        p_provider_message_id: o.providerId,
        p_error: o.error,
      });
      if (o.error) failed++;
      else sent++;
    }
  }

  return { ok: true, claimed: rows.length, sent, failed };
}
