import { utcToZoned } from "./time";

export const SESSION_TYPES = [
  { value: "keynote", label: "Keynote" },
  { value: "talk", label: "Talk" },
  { value: "panel", label: "Panel" },
  { value: "workshop", label: "Workshop" },
  { value: "break", label: "Break" },
  { value: "networking", label: "Networking" },
  { value: "other", label: "Other" },
] as const;
export type SessionType = (typeof SESSION_TYPES)[number]["value"];
export const sessionTypeLabel = (t: string) => SESSION_TYPES.find((x) => x.value === t)?.label ?? "Session";

export const TITLE_MAX = 200;
export const NAME_MAX = 60;

export type Track = { id: string; name: string; sort_order: number };
export type Hall = { id: string; name: string; sort_order: number };

/** A session as the agenda UI needs it; times are already converted to the event timezone. */
export type AgendaSession = {
  id: string;
  title: string;
  description: string | null;
  sessionType: SessionType;
  isFeatured: boolean;
  trackId: string | null;
  hallId: string | null;
  speakerIds: string[];
  /** Legacy free-text speaker; shown until cleared. */
  speakerText: string | null;
  /** null = to be announced */
  slot: { date: string; startMin: number; endMin: number; startTime: string } | null;
};

export type SessionInput = {
  title: string;
  description: string;
  sessionType: SessionType;
  isFeatured: boolean;
  trackId: string | null;
  hallId: string | null;
  speakerIds: string[];
  speakerText: string;
  tba: boolean;
  date: string;
  startTime: string;
  durationMin: number;
};

export const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
export const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export function formatClock(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h ? `${h}h` : "", m ? `${m}m` : ""].filter(Boolean).join(" ") || "0m";
}

/** Converts stored UTC times into the event timezone. Sessions crossing midnight are clipped to their start day. */
export function toSlot(startIso: string | null, endIso: string | null, tz: string): AgendaSession["slot"] {
  if (!startIso || !endIso) return null;
  const a = utcToZoned(startIso, tz);
  const b = utcToZoned(endIso, tz);
  const startMin = minutesOf(a.time);
  const endMin = b.date === a.date ? minutesOf(b.time) : 24 * 60;
  return { date: a.date, startMin, endMin: Math.max(endMin, startMin + 5), startTime: a.time };
}

/** The part of a day (in minutes) that lies inside the event window. */
export function dayWindow(date: string, event: { start: { date: string; time: string }; end: { date: string; time: string } }) {
  const open = date === event.start.date ? minutesOf(event.start.time) : 0;
  const close = date === event.end.date ? minutesOf(event.end.time) : 24 * 60;
  return { open, close };
}

/**
 * Visible grid range. Real event edges (first/last day) are shown as-is; a day with no edge
 * (midnight to midnight) defaults to 8 AM–8 PM. Always widened to fit every session.
 */
export function gridRange(win: { open: number; close: number }, sessions: { startMin: number; endMin: number }[]) {
  let start = win.open === 0 ? (win.close >= 9 * 60 ? 8 * 60 : 0) : win.open;
  let end = win.close === 24 * 60 ? (start < 19 * 60 ? 20 * 60 : 24 * 60) : win.close;
  for (const s of sessions) {
    start = Math.min(start, s.startMin);
    end = Math.max(end, s.endMin);
  }
  start = Math.floor(start / 60) * 60;
  end = Math.min(24 * 60, Math.ceil(end / 60) * 60);
  return { start, end: Math.max(end, start + 60) };
}

/**
 * Side-by-side placement for overlapping sessions in one column.
 * Returns lane index and lane count per session so blocks can share the width.
 */
export function layoutLanes<T extends { id: string; startMin: number; endMin: number }>(items: T[]) {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const out = new Map<string, { lane: number; lanes: number }>();
  let cluster: T[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    for (const it of cluster) out.set(it.id, { lane: out.get(it.id)!.lane, lanes: laneEnds.length });
    cluster = [];
    laneEnds = [];
  };
  for (const it of sorted) {
    if (it.startMin >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= it.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(it.endMin);
    } else laneEnds[lane] = it.endMin;
    out.set(it.id, { lane, lanes: 0 });
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.endMin);
  }
  flush();
  return out;
}
