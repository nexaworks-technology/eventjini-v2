import Link from "next/link";
import {
  ADMIN_ROLES,
  CHECKIN_ROLES,
  ROLE_LABELS,
  TASK_READ_ROLES,
  type EventRole,
} from "@/lib/event-access";

type Item = { key: string; label: string; path: string; roles: EventRole[] | null };

const ITEMS: Item[] = [
  { key: "overview", label: "Overview", path: "", roles: null },
  { key: "registration", label: "Registration", path: "/registration", roles: ADMIN_ROLES },
  { key: "guests", label: "Guests", path: "/guests", roles: ADMIN_ROLES },
  { key: "check-in", label: "Check-in", path: "/check-in", roles: CHECKIN_ROLES },
  { key: "agenda", label: "Agenda", path: "/agenda", roles: null },
  { key: "tasks", label: "Tasks", path: "/tasks", roles: TASK_READ_ROLES },
  { key: "team", label: "Team", path: "/team", roles: ADMIN_ROLES },
];

export function EventNav({
  eventId,
  eventTitle,
  role,
  active,
}: {
  eventId: string;
  eventTitle: string;
  role: EventRole;
  active: string;
}) {
  return (
    <header className="space-y-3">
      <div>
        <Link href="/dashboard/events" className="text-sm text-zinc-500 hover:underline">
          ← Your events
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900">{eventTitle}</h1>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
            {ROLE_LABELS[role]}
          </span>
        </div>
      </div>
      <nav className="flex flex-wrap gap-2 text-sm">
        {ITEMS.filter((i) => !i.roles || i.roles.includes(role)).map((i) => (
          <Link
            key={i.key}
            href={`/dashboard/events/${eventId}${i.path}`}
            className={`rounded-full px-3 py-1 ${
              active === i.key ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            {i.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
