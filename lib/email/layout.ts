import { DEFAULT_PRIMARY, normalizeHex, readableOn } from "@/lib/branding";
import { escapeHtml } from "@/lib/email/template";

export type EmailBrand = {
  eventTitle: string;
  primaryColor?: string | null;
  coverImageUrl?: string | null;
  /** Public event page. When present a call-to-action button is rendered. */
  eventUrl?: string | null;
  /** Shown in the "When / Where" panel. Leave empty to hide the panel. */
  when?: string;
  where?: string;
  /** Hidden inbox-preview line shown next to the subject. */
  preheader?: string;
  /** Broadcast (marketing) emails only: adds an unsubscribe link to the footer. */
  unsubscribeUrl?: string | null;
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function paragraphs(text: string): string {
  return escapeHtml(text)
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map(
      (p) =>
        `<p style="margin:0 0 18px;font-size:16px;line-height:1.65;color:#27272a">${p.replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

/**
 * Table-based, inline-styled HTML that renders consistently in Gmail, Outlook and Apple Mail.
 * Pure function: used by the worker to send and by the composer for live preview.
 */
export function renderEmailHtml(text: string, brand: EmailBrand): string {
  const primary = normalizeHex(brand.primaryColor) ?? DEFAULT_PRIMARY;
  const onPrimary = readableOn(primary);
  const title = escapeHtml(brand.eventTitle);
  const preheader = escapeHtml(brand.preheader ?? text.replace(/\s+/g, " ").slice(0, 110));

  const cover = brand.coverImageUrl
    ? `<tr><td style="padding:0"><img src="${escapeHtml(brand.coverImageUrl)}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr>`
    : "";

  const details =
    brand.when || brand.where
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;background:#f4f4f5;border-radius:12px"><tr><td style="padding:16px 20px;font-family:${FONT};font-size:14px;line-height:1.6;color:#27272a">${
          brand.when ? `<div><strong style="color:#52525b">When</strong><br>${escapeHtml(brand.when)}</div>` : ""
        }${
          brand.where
            ? `<div style="${brand.when ? "margin-top:12px" : ""}"><strong style="color:#52525b">Where</strong><br>${escapeHtml(brand.where)}</div>`
            : ""
        }</td></tr></table>`
      : "";

  const button = brand.eventUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 8px"><tr><td style="border-radius:10px;background:${primary}"><a href="${escapeHtml(brand.eventUrl)}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:600;color:${onPrimary};text-decoration:none;border-radius:10px">View event details</a></td></tr></table>`
    : "";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${preheader}&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:${FONT}">
<tr><td style="height:6px;line-height:6px;font-size:6px;background:${primary}">&nbsp;</td></tr>
${cover}
<tr><td style="padding:32px 36px 12px">
<p style="margin:0 0 20px;font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#71717a">${title}</p>
${paragraphs(text)}
${details}
${button}
</td></tr>
<tr><td style="padding:20px 36px 32px;border-top:1px solid #e4e4e7;font-size:12px;line-height:1.6;color:#71717a">
You're receiving this because you registered for ${title}.<br>
Sent with <a href="https://eventjini-v2.vercel.app" style="color:#71717a">EventJini</a>.${
  brand.unsubscribeUrl
    ? `<br><a href="${escapeHtml(brand.unsubscribeUrl)}" style="color:#71717a;text-decoration:underline">Unsubscribe from updates for this event</a>`
    : ""
}
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}
