import "server-only";
import { renderEmailHtml } from "@/lib/email/layout";
import { emailConfigured, fromAddress, getResend } from "@/lib/email/resend";

const ROLE_LABELS: Record<string, string> = { admin: "an admin", scanner: "a check-in scanner", viewer: "a viewer" };

/**
 * Sends a team invitation directly (not through the registration email queue).
 * Returns false when email isn't configured or Resend rejects it; callers fall back to showing the link.
 */
export async function sendTeamInviteEmail(input: {
  to: string;
  link: string;
  role: string;
  inviterName: string;
  event: { title: string; primary_color: string | null; cover_image_url: string | null };
}): Promise<boolean> {
  if (!emailConfigured()) return false;
  const { to, link, role, inviterName, event } = input;
  const text =
    `${inviterName} invited you to join the team for ${event.title} on EventJini as ${ROLE_LABELS[role] ?? role}.\n\n` +
    `Accept the invitation with the button below. Sign in or create an account with this email address (${to}). The link expires in 7 days.`;
  try {
    const { error } = await getResend().emails.send({
      from: fromAddress(),
      to: [to],
      subject: `You're invited to the ${event.title} team`,
      text: `${text}\n\nAccept: ${link}`,
      html: renderEmailHtml(text, {
        eventTitle: event.title,
        primaryColor: event.primary_color,
        coverImageUrl: event.cover_image_url,
        eventUrl: link,
        ctaLabel: "Accept invitation",
        footerNote: `You're receiving this because ${inviterName} invited ${to} to an event team.`,
        preheader: `${inviterName} invited you to the ${event.title} team`,
      }),
    });
    return !error;
  } catch {
    return false;
  }
}

const ORG_ROLE_PHRASES: Record<string, string> = { admin: "an admin", member: "a member" };

/** Organization invitation; same delivery and fallback rules as sendTeamInviteEmail. */
export async function sendOrgInviteEmail(input: { to: string; link: string; role: string; inviterName: string; orgName: string }): Promise<boolean> {
  if (!emailConfigured()) return false;
  const { to, link, role, inviterName, orgName } = input;
  const text =
    `${inviterName} invited you to join ${orgName} on EventJini as ${ORG_ROLE_PHRASES[role] ?? role}. ` +
    `Members can work on all of the organization's events.\n\n` +
    `Accept the invitation with the button below. Sign in or create an account with this email address (${to}). The link expires in 7 days.`;
  try {
    const { error } = await getResend().emails.send({
      from: fromAddress(),
      to: [to],
      subject: `You're invited to join ${orgName} on EventJini`,
      text: `${text}\n\nAccept: ${link}`,
      html: renderEmailHtml(text, {
        eventTitle: orgName,
        primaryColor: null,
        coverImageUrl: null,
        eventUrl: link,
        ctaLabel: "Accept invitation",
        footerNote: `You're receiving this because ${inviterName} invited ${to} to an organization.`,
        preheader: `${inviterName} invited you to join ${orgName}`,
      }),
    });
    return !error;
  } catch {
    return false;
  }
}
