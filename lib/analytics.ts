export const VISITOR_COOKIE = "ej_visitor_id";
export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
export type UtmKey = (typeof UTM_KEYS)[number];

export function cleanParam(value: unknown, max = 200): string | null {
  if (typeof value !== "string") return null;
  const v = value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
  return v || null;
}

/** utm_source > external referrer domain > Direct */
export function normalizeSource(utmSource: string | null, referrer: string | null, ownHost: string): string {
  if (utmSource) {
    const s = utmSource.toLowerCase();
    return s === "direct" ? "Direct" : s;
  }
  if (referrer) {
    try {
      const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
      const own = ownHost.toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");
      if (host && host !== own) return host;
    } catch {}
  }
  return "Direct";
}
