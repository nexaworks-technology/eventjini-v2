import type { CSSProperties } from "react";

export const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
export const DEFAULT_PRIMARY = "#C2410C";
export const DEFAULT_ACCENT = "#C2410C";

export function normalizeHex(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return HEX_RE.test(t) ? t.toUpperCase() : null;
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastOnWhite(hex: string): number {
  return 1.05 / (luminance(hex) + 0.05);
}

/** Whichever of near-black or white has the higher WCAG contrast ratio on the given background. */
export function readableOn(hex: string): string {
  const l = luminance(hex);
  const vsWhite = 1.05 / (l + 0.05);
  const vsBlack = (l + 0.05) / (luminance("#111111") + 0.05);
  return vsBlack >= vsWhite ? "#111111" : "#FFFFFF";
}

/** Event-scoped custom properties for public pages. Never applied to the dashboard. */
export function eventBrandStyle(primary: string | null, accent: string | null): CSSProperties {
  const p = normalizeHex(primary) ?? DEFAULT_PRIMARY;
  const a = normalizeHex(accent) ?? normalizeHex(primary) ?? DEFAULT_ACCENT;
  return {
    "--event-primary": p,
    "--event-primary-foreground": readableOn(p),
    "--event-accent": a,
    "--event-accent-foreground": readableOn(a),
  } as CSSProperties;
}
