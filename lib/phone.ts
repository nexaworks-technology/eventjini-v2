/** Country dialing codes offered on phone inputs, with the allowed national-number length. */
export type CountryCode = { code: string; country: string; min: number; max: number };

export const COUNTRY_CODES: CountryCode[] = [
  { code: "+91", country: "India", min: 10, max: 10 },
  { code: "+971", country: "United Arab Emirates", min: 9, max: 9 },
  { code: "+966", country: "Saudi Arabia", min: 9, max: 9 },
  { code: "+974", country: "Qatar", min: 8, max: 8 },
  { code: "+965", country: "Kuwait", min: 8, max: 8 },
  { code: "+968", country: "Oman", min: 8, max: 8 },
  { code: "+973", country: "Bahrain", min: 8, max: 8 },
  { code: "+65", country: "Singapore", min: 8, max: 8 },
  { code: "+60", country: "Malaysia", min: 9, max: 10 },
  { code: "+977", country: "Nepal", min: 10, max: 10 },
  { code: "+94", country: "Sri Lanka", min: 9, max: 9 },
  { code: "+880", country: "Bangladesh", min: 10, max: 10 },
  { code: "+1", country: "United States / Canada", min: 10, max: 10 },
  { code: "+44", country: "United Kingdom", min: 10, max: 10 },
  { code: "+61", country: "Australia", min: 9, max: 9 },
  { code: "+49", country: "Germany", min: 10, max: 11 },
  { code: "+33", country: "France", min: 9, max: 9 },
];

export const DEFAULT_COUNTRY_CODE = "+91";

const PHONE_RE = /^(\+\d{1,4}) (\d+)$/;

/** Splits a stored "+91 9876543210" value into its parts. Unknown formats come back as a bare number. */
export function splitPhone(value: string): { code: string; number: string } {
  const m = PHONE_RE.exec(value.trim());
  if (m && COUNTRY_CODES.some((c) => c.code === m[1])) return { code: m[1], number: m[2] };
  return { code: DEFAULT_COUNTRY_CODE, number: value.replace(/\D/g, "") };
}

export function joinPhone(code: string, number: string): string {
  const digits = number.replace(/\D/g, "");
  return digits ? `${code} ${digits}` : "";
}

/** Returns an error message, or null when the stored phone value is valid. */
export function phoneError(value: string): string | null {
  const m = PHONE_RE.exec(value.trim());
  const country = m && COUNTRY_CODES.find((c) => c.code === m[1]);
  if (!m || !country) return "Choose a country code and enter a valid mobile number.";
  const n = m[2].length;
  if (n < country.min || n > country.max) {
    const len = country.min === country.max ? `${country.min}` : `${country.min} to ${country.max}`;
    return `Mobile numbers for ${country.country} (${country.code}) must be ${len} digits.`;
  }
  if (country.code === "+91" && !/^[6-9]/.test(m[2])) return "Indian mobile numbers start with 6, 7, 8 or 9.";
  return null;
}
