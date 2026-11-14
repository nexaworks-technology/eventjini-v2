import { SLUG_RE } from "./slug";
import { isValidTimezone, utcToZoned, zonedToUtc } from "./time";

export type EventStatus =
  | "draft"
  | "review"
  | "scheduled"
  | "published"
  | "sales_open"
  | "pre_event"
  | "live"
  | "completed"
  | "cancelled"
  | "archived";

export type EventType = "in_person" | "virtual" | "hybrid";
export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "in_person", label: "In-person" },
  { value: "virtual", label: "Virtual" },
  { value: "hybrid", label: "Hybrid" },
];

export const SOCIAL_KEYS = ["website", "x", "linkedin", "instagram", "facebook", "youtube"] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];
export type SocialLinks = Partial<Record<SocialKey, string>>;
export const SOCIAL_LABELS: Record<SocialKey, string> = {
  website: "Website", x: "X (Twitter)", linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook", youtube: "YouTube",
};

export const SUMMARY_MAX = 250;
export const TAGS_MAX = 10;
const TAG_MAX_LENGTH = 40;
const VENUE_ADDRESS_MAX = 500;

export type EventRow = {
  id: string;
  organizer_id: string;
  organization_id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  start_at: string;
  end_at: string;
  timezone: string;
  location: string | null;
  event_type: EventType;
  summary: string | null;
  tags: string[];
  venue_address: string | null;
  social_links: SocialLinks;
  capacity: number | null;
  requires_approval: boolean;
  require_b2b_data: boolean;
  status: EventStatus;
  primary_color: string | null;
  accent_color: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type EventFormValues = {
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string;
  location: string;
  eventType: EventType;
  summary: string;
  /** Comma-separated in the form; parsed by validateEventValues. */
  tags: string;
  venueAddress: string;
  socialLinks: Record<SocialKey, string>;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timezone: string;
  capacity: string;
  requiresApproval: boolean;
  requireB2bData: boolean;
};

export type FieldName = Exclude<keyof EventFormValues, "socialLinks"> | `social.${SocialKey}` | "range";
export type FieldErrors = Partial<Record<FieldName, string>>;

export const STEP_FIELDS: FieldName[][] = [
  ["title", "slug", "eventType", "summary", "tags", "coverImageUrl", "location", "venueAddress"],
  ["startDate", "startTime", "endDate", "endTime", "timezone", "range"],
  ["capacity"],
  [],
];

const MAX_CAPACITY = 2_147_483_647;

export function validateEventValues(v: EventFormValues): {
  errors: FieldErrors;
  startAt?: Date;
  endAt?: Date;
  capacity: number | null;
  tags: string[];
  socialLinks: SocialLinks;
} {
  const errors: FieldErrors = {};

  if (!v.title.trim()) errors.title = "Event title is required.";

  if (!v.slug) errors.slug = "Event page link is required.";
  else if (!SLUG_RE.test(v.slug))
    errors.slug = "Use lowercase letters, numbers and single hyphens only.";

  if (!EVENT_TYPES.some((t) => t.value === v.eventType)) errors.eventType = "Choose an event type.";
  if (v.eventType !== "virtual" && !v.location.trim())
    errors.location = "Venue is required. If it isn't decided yet, enter TBD.";
  if (v.summary.trim().length > SUMMARY_MAX) errors.summary = `Keep the summary to ${SUMMARY_MAX} characters or fewer.`;
  if (v.venueAddress.trim().length > VENUE_ADDRESS_MAX) errors.venueAddress = "That address is too long.";

  const tags = parseTags(v.tags);
  if (tags.length > TAGS_MAX) errors.tags = `Use at most ${TAGS_MAX} tags.`;
  else if (tags.some((t) => t.length > TAG_MAX_LENGTH)) errors.tags = `Each tag can be up to ${TAG_MAX_LENGTH} characters.`;

  const socialLinks: SocialLinks = {};
  for (const key of SOCIAL_KEYS) {
    const raw = v.socialLinks[key]?.trim();
    if (!raw) continue;
    if (isHttpUrl(raw)) socialLinks[key] = raw;
    else errors[`social.${key}`] = "Enter a full link starting with https://";
  }

  if (v.coverImageUrl.trim() && !isHttpUrl(v.coverImageUrl.trim())) errors.coverImageUrl = "Enter a valid http(s) image URL.";

  if (!v.startDate) errors.startDate = "Start date is required.";
  if (!v.startTime) errors.startTime = "Start time is required.";
  if (!v.endDate) errors.endDate = "End date is required.";
  if (!v.endTime) errors.endTime = "End time is required.";
  if (!isValidTimezone(v.timezone)) errors.timezone = "Choose a valid timezone.";

  let startAt: Date | undefined;
  let endAt: Date | undefined;
  if (!errors.startDate && !errors.startTime && !errors.timezone) {
    startAt = zonedToUtc(v.startDate, v.startTime, v.timezone) ?? undefined;
    if (!startAt) errors.startDate = "Enter a valid start date and time.";
  }
  if (!errors.endDate && !errors.endTime && !errors.timezone) {
    endAt = zonedToUtc(v.endDate, v.endTime, v.timezone) ?? undefined;
    if (!endAt) errors.endDate = "Enter a valid end date and time.";
  }
  if (startAt && endAt && endAt <= startAt) {
    errors.range = "End time must be after the event start time.";
  }

  let capacity: number | null = null;
  const rawCapacity = v.capacity.trim();
  if (rawCapacity) {
    const n = Number(rawCapacity);
    if (!/^\d+$/.test(rawCapacity) || n <= 0 || n > MAX_CAPACITY) {
      errors.capacity = "Capacity must be a whole number greater than 0.";
    } else {
      capacity = n;
    }
  }

  return { errors, startAt, endAt, capacity, tags, socialLinks };
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Splits on commas, trims, drops blanks and case-insensitive duplicates. */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(",")) {
    const tag = raw.trim().replace(/\s+/g, " ");
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    out.push(tag);
  }
  return out;
}

function emptySocialLinks(): Record<SocialKey, string> {
  return Object.fromEntries(SOCIAL_KEYS.map((k) => [k, ""])) as Record<SocialKey, string>;
}

/** Google Maps search link for the venue; needs no API key. */
export function mapsUrl(event: Pick<EventRow, "location" | "venue_address">): string | null {
  const q = [event.location, event.venue_address].filter((p) => p && p.trim() && p.trim().toUpperCase() !== "TBD").join(", ");
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

export function eventToFormValues(event: EventRow): EventFormValues {
  const start = utcToZoned(event.start_at, event.timezone);
  const end = utcToZoned(event.end_at, event.timezone);
  return {
    title: event.title,
    slug: event.slug,
    description: event.description ?? "",
    coverImageUrl: event.cover_image_url ?? "",
    location: event.location ?? "",
    eventType: event.event_type ?? "in_person",
    summary: event.summary ?? "",
    tags: (event.tags ?? []).join(", "),
    venueAddress: event.venue_address ?? "",
    socialLinks: { ...emptySocialLinks(), ...(event.social_links ?? {}) },
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
    timezone: event.timezone,
    capacity: event.capacity === null ? "" : String(event.capacity),
    requiresApproval: event.requires_approval,
    requireB2bData: event.require_b2b_data,
  };
}

export function emptyFormValues(): EventFormValues {
  return {
    title: "",
    slug: "",
    description: "",
    coverImageUrl: "",
    location: "",
    eventType: "in_person",
    summary: "",
    tags: "",
    venueAddress: "",
    socialLinks: emptySocialLinks(),
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    timezone: "UTC",
    capacity: "",
    requiresApproval: false,
    requireB2bData: false,
  };
}
