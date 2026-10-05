export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD"] as const;

export function toCents(n: number | string): number {
  return Math.round(Number(n) * 100);
}

export function formatMoney(cents: number, currency: string, signed = false): string {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
      signDisplay: signed ? "exceptZero" : "auto",
    }).format(cents / 100);
  } catch {
    return `${signed && cents > 0 ? "+" : ""}${(cents / 100).toFixed(2)} ${currency}`;
  }
}

/** Parses a money input. Returns null when it is not a non-negative amount with at most two decimals. */
export function parseAmount(input: string): number | null {
  const v = input.trim().replace(/,/g, "");
  if (v === "") return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return null;
  const n = Number(v);
  return n <= 9_999_999_999.99 ? n : null;
}
