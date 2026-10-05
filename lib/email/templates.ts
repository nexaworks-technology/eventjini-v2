export type EmailTemplate = {
  id: string;
  name: string;
  description: string;
  /** Which tools suggest it. */
  use: ("broadcast" | "registration_approved" | "event_start_24h")[];
  subject: string;
  body: string;
};

/** Starter library, available to every organizer. Copied into the editor, so organizers can freely edit. */
export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "welcome-approved",
    name: "You're in (approval)",
    description: "Confirms an approved registration.",
    use: ["registration_approved"],
    subject: "You're in! See you at {{event_title}}",
    body: `Hi {{first_name}},

Great news: your registration for {{event_title}} is confirmed, and we can't wait to see you.

Your ticket with its QR code is waiting on the event page. Keep it handy on your phone, because it's how you'll get checked in at the door.

If your plans change, just reply to this email and let us know.`,
  },
  {
    id: "reminder-24h",
    name: "Tomorrow reminder",
    description: "A friendly nudge the day before.",
    use: ["event_start_24h", "broadcast"],
    subject: "Tomorrow: {{event_title}}",
    body: `Hi {{first_name}},

{{event_title}} starts tomorrow. Here's everything you need to know.

Please arrive a few minutes early and have your QR ticket ready on your phone, so check-in takes seconds.

See you tomorrow!`,
  },
  {
    id: "event-day",
    name: "Today's the day",
    description: "Morning-of logistics.",
    use: ["broadcast"],
    subject: "Today at {{event_title}}: what to expect",
    body: `Good morning {{first_name}},

Today's the day! Doors for {{event_title}} open at {{event_date}}.

Quick checklist:
• Your QR ticket (open it from the event page)
• A photo ID if the venue asks for one
• A charged phone

We're excited to host you.`,
  },
  {
    id: "announcement",
    name: "Announcement",
    description: "Share news or an update with attendees.",
    use: ["broadcast"],
    subject: "News about {{event_title}}",
    body: `Hi {{first_name}},

We have an update to share about {{event_title}}.

[Write your announcement here: new speaker, new session, a perk for attendees.]

Thanks for being part of it. We'll keep you posted as things develop.`,
  },
  {
    id: "schedule-change",
    name: "Schedule or venue change",
    description: "Important change to time or location.",
    use: ["broadcast"],
    subject: "Important update: {{event_title}}",
    body: `Hi {{first_name}},

Please note an important change to {{event_title}}.

[Describe what changed and why.]

The details below are up to date. Your ticket remains valid and nothing else is needed from you. Sorry for any inconvenience, and thank you for understanding.`,
  },
  {
    id: "last-call",
    name: "Last call",
    description: "Encourage pending applicants or fence-sitters.",
    use: ["broadcast"],
    subject: "Last chance: {{event_title}}",
    body: `Hi {{first_name}},

Spots for {{event_title}} are filling up fast, and we'd hate for you to miss it.

Open the event page to complete or check your registration.

Hope to see you there!`,
  },
  {
    id: "thank-you",
    name: "Thank you",
    description: "Post-event follow-up.",
    use: ["broadcast"],
    subject: "Thank you for joining {{event_title}}",
    body: `Hi {{first_name}},

Thank you for being part of {{event_title}}. It was a pleasure having you with us.

We'd love your feedback: just reply to this email with what worked and what we can do better next time.

Hope to see you again soon.`,
  },
];
