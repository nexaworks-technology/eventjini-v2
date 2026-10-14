/** Email format checks shared by client and server. Domain existence is checked server-side in lib/email-domain.ts. */
export const EMAIL_RE = /^[^@\s]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;

const TYPOS: Record<string, string> = {
  "gmail.co": "gmail.com", "gmail.cm": "gmail.com", "gmail.con": "gmail.com", "gmail.in": "gmail.com",
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmal.com": "gmail.com", "gamil.com": "gmail.com", "gnail.com": "gmail.com", "gmaill.com": "gmail.com",
  "yahoo.co": "yahoo.com", "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com",
  "hotmail.co": "hotmail.com", "hotmai.com": "hotmail.com", "hotmal.com": "hotmail.com",
  "outlook.co": "outlook.com", "outlok.com": "outlook.com",
  "rediffmail.co": "rediffmail.com", "redifmail.com": "rediffmail.com",
};

/** Returns an error message, or null when the address looks valid. */
export function emailFormatError(email: string): string | null {
  const e = email.trim();
  if (!e) return "Email is required.";
  if (!EMAIL_RE.test(e)) return "Enter a complete email address, like name@company.com.";
  const [local, domain] = [e.slice(0, e.lastIndexOf("@")), e.slice(e.lastIndexOf("@") + 1).toLowerCase()];
  if (TYPOS[domain]) return `Did you mean ${local}@${TYPOS[domain]}?`;
  return null;
}
