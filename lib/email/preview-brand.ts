import type { EmailBrand } from "@/lib/email/layout";
import type { EventRow } from "@/lib/events";
import { formatEventWhen } from "@/lib/time";

/** Serializable brand context for the composer preview. */
export function previewBrand(event: EventRow): EmailBrand {
  const when = formatEventWhen(event.start_at, event.end_at, event.timezone);
  return {
    eventTitle: event.title,
    primaryColor: event.primary_color,
    coverImageUrl: event.cover_image_url,
    eventUrl: `/e/${event.slug}`,
    when: `${when.date}, ${when.time} (${event.timezone})`,
    where: event.location ?? "",
  };
}
