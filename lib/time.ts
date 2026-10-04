export function isValidTimezone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function getTimezones(): string[] {
  let zones: string[] = [];
  try {
    zones = Intl.supportedValuesOf("timeZone");
  } catch {
    zones = [];
  }
  return zones.includes("UTC") ? zones : ["UTC", ...zones];
}

function zonedParts(utcMs: number, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function offsetMs(utcMs: number, tz: string): number {
  const p = zonedParts(utcMs, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** Interprets a wall-clock date + time in `tz` and returns the matching instant. */
export function zonedToUtc(date: string, time: string, tz: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t || !isValidTimezone(tz)) return null;

  const [y, mo, da, h, mi] = [d[1], d[2], d[3], t[1], t[2]].map(Number);
  const guess = Date.UTC(y, mo - 1, da, h, mi);
  const check = new Date(guess);
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== mo - 1 ||
    check.getUTCDate() !== da ||
    h > 23 ||
    mi > 59
  ) {
    return null;
  }

  const off1 = offsetMs(guess, tz);
  let result = guess - off1;
  const off2 = offsetMs(result, tz);
  if (off2 !== off1) result = guess - off2;
  return new Date(result);
}

export function utcToZoned(iso: string, tz: string): { date: string; time: string } {
  const p = zonedParts(new Date(iso).getTime(), tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
    time: `${pad(p.hour)}:${pad(p.minute)}`,
  };
}

export function formatEventWhen(startIso: string, endIso: string, tz: string) {
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  });
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = dateFmt.format(start) === dateFmt.format(end);

  if (sameDay) {
    return {
      date: dateFmt.format(start),
      time: `${timeFmt.format(start)} – ${timeFmt.format(end)}`,
    };
  }
  return {
    date: `${dateFmt.format(start)} – ${dateFmt.format(end)}`,
    time: `${timeFmt.format(start)} – ${timeFmt.format(end)}`,
  };
}

export function formatShortDate(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}
