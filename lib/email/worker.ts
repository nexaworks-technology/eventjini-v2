import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailConfigured, fromAddress, getResend } from "@/lib/email/resend";
import { formatEventWhen } from "@/lib/time";
import { renderEmailHtml } from "@/lib/email/layout";
import { renderTemplate } from "@/lib/email/template";

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
  event_slug?: string;
  event_primary_color?: string | null;
  event_cover_image_url?: string | null;
  is_broadcast?: boolean;
  unsubscribe_token?: string | null;
};

export type QueueResult =
  | { ok: true; claimed: number; sent: number; failed: number }
  | { ok: false; reason: "not_configured" | "error" };

const CHUNK = 50;

function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return prod ? `https://${prod}` : "http://localhost:3000";
}

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
      const unsubscribeUrl = r.is_broadcast && r.unsubscribe_token ? `${siteUrl()}/unsubscribe/${r.unsubscribe_token}` : null;
      return {
        from,
        to: [r.recipient_email],
        subject: renderTemplate(r.subject, vars),
        text: unsubscribeUrl ? `${text}\n\n--\nUnsubscribe: ${unsubscribeUrl}` : text,
        headers: unsubscribeUrl
          ? {
              "List-Unsubscribe": `<${siteUrl()}/api/unsubscribe/${r.unsubscribe_token}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            }
          : undefined,
        html: renderEmailHtml(text, {
          eventTitle: r.event_title,
          primaryColor: r.event_primary_color,
          coverImageUrl: r.event_cover_image_url,
          eventUrl: r.event_slug ? `${siteUrl()}/e/${r.event_slug}` : null,
          when: `${when.date}, ${when.time} (${r.event_timezone})`,
          where: r.event_location ?? "",
          unsubscribeUrl,
        }),
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
