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
