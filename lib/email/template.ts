export const TEMPLATE_VARIABLES = ["first_name", "event_title", "event_date", "event_location"] as const;
export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

const VAR_RE = /\{\{\s*([A-Za-z0-9_]*)\s*\}\}/g;

export function findUnknownVariable(text: string): string | null {
  for (const m of text.matchAll(VAR_RE)) {
    if (!(TEMPLATE_VARIABLES as readonly string[]).includes(m[1])) return m[1] || "(empty)";
  }
  return null;
}

export function renderTemplate(text: string, vars: Record<TemplateVariable, string>): string {
  return text.replace(VAR_RE, (_, name: string) => vars[name as TemplateVariable] ?? "");
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function renderHtml(text: string, eventTitle: string): string {
  const body = escapeHtml(text)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#fafafa;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#171717">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
<p style="margin:0 0 20px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#71717a">EventJini · ${escapeHtml(eventTitle)}</p>
${body}
</div></body></html>`;
}
