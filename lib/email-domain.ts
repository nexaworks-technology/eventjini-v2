import "server-only";
import { promises as dns } from "node:dns";

const NOT_FOUND = new Set(["ENOTFOUND", "ENODATA"]);

async function exists(lookup: () => Promise<unknown[]>): Promise<boolean | null> {
  try {
    return (await lookup()).length > 0;
  } catch (e) {
    return NOT_FOUND.has((e as NodeJS.ErrnoException).code ?? "") ? false : null;
  }
}

/**
 * Checks that the email's domain can receive mail (an MX record, or an A record as the RFC 5321 fallback).
 * Returns false only when DNS definitively says the domain does not exist; network trouble or a slow
 * resolver never blocks a registration.
 */
export async function emailDomainExists(email: string): Promise<boolean> {
  const domain = email.trim().slice(email.trim().lastIndexOf("@") + 1).toLowerCase();
  if (!domain) return false;
  const check = (async () => {
    const mx = await exists(() => dns.resolveMx(domain));
    if (mx !== false) return mx ?? true;
    const a = await exists(() => dns.resolve4(domain));
    if (a !== false) return a ?? true;
    return (await exists(() => dns.resolve6(domain))) ?? true;
  })();
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 3000));
  return Promise.race([check, timeout]);
}
