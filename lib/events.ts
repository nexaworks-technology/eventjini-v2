import { SLUG_RE } from "./slug";
import { isValidTimezone, zonedToUtc } from "./time";

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

export type EventRow = {
  id: string;
  organizer_id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  start_at: string;
  end_at: string;
  timezone: string;
  location: string | null;
  capacity: number | null;
  requires_approval: boolean;
  require_b2b_data: boolean;
  status: EventStatus;
  created_at: string;
  updated_at: string;
};

export type EventFormValues = {
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string;
  location: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timezone: string;
  capacity: string;
  requiresApproval: boolean;
  requireB2bData: boolean;
};

export type FieldName = keyof EventFormValues | "range";
export type FieldErrors = Partial<Record<FieldName, string>>;

export const STEP_FIELDS: FieldName[][] = [
  ["title", "slug", "coverImageUrl"],
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
} {
  const errors: FieldErrors = {};

  if (!v.title.trim()) errors.title = "Event title is required.";

  if (!v.slug) errors.slug = "Slug is required.";
  else if (!SLUG_RE.test(v.slug))
    errors.slug = "Use lowercase letters, numbers and single hyphens only.";

  if (v.coverImageUrl.trim()) {
    try {
      const u = new URL(v.coverImageUrl.trim());
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
    } catch {
      errors.coverImageUrl = "Enter a valid http(s) image URL.";
    }
  }

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

  return { errors, startAt, endAt, capacity };
}

export function emptyFormValues(): EventFormValues {
  return {
    title: "",
    slug: "",
    description: "",
    coverImageUrl: "",
    location: "",
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
