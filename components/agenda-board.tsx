"use client";

import { CalendarDays, List, Plus, Settings2, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteHall,
  deleteSession,
  deleteTrack,
  saveHall,
  saveSession,
  saveTrack,
} from "@/app/dashboard/events/[id]/agenda/actions";
import { btnPrimary, btnSecondary, btnSecondarySm, inputCls } from "@/components/eventjini/classes";
import { useConfirm } from "@/components/eventjini/confirm-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  formatClock,
  formatDuration,
  gridRange,
  hhmm,
  layoutLanes,
  minutesOf,
  NAME_MAX,
  SESSION_TYPES,
  sessionTypeLabel,
  TITLE_MAX,
  type AgendaSession,
  type Hall,
  type SessionInput,
  type Track,
} from "@/lib/agenda";
import { cn } from "@/lib/utils";

export type AgendaDay = { date: string; label: string; short: string; window: { open: number; close: number } };
type Speaker = { id: string; name: string; detail: string };
type Result = { ok: boolean; error?: string; warning?: string };

const PX_PER_MIN = 1.4;
const SLOT_MIN = 30;
const DEFAULT_DURATION = 60;

type Props = {
  eventId: string;
  canEdit: boolean;
  days: AgendaDay[];
  sessions: AgendaSession[];
  tracks: Track[];
  halls: Hall[];
  speakers: Speaker[];
};

export function AgendaBoard({ eventId, canEdit, days, sessions, tracks, halls, speakers }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [view, setView] = useState<"schedule" | "list">("schedule");
  const [dayIdx, setDayIdx] = useState(0);
  const [drawer, setDrawer] = useState<{ id: string | null; input: SessionInput } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "warn"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const day = days[Math.min(dayIdx, days.length - 1)];
  const scheduled = sessions.filter((s) => s.slot);
  const tba = sessions.filter((s) => !s.slot);
  const speakerName = new Map(speakers.map((s) => [s.id, s.name]));
  const hallName = new Map(halls.map((h) => [h.id, h.name]));
  const trackName = new Map(tracks.map((t) => [t.id, t.name]));

  function run(fn: () => Promise<Result>, after?: () => void) {
    setMessage(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setMessage({ tone: "error", text: r.error ?? "Something went wrong." });
      else {
        if (r.warning) setMessage({ tone: "warn", text: r.warning });
        after?.();
      }
      router.refresh();
    });
  }

  function openNew(preset: Partial<SessionInput> = {}) {
    if (!canEdit) return;
    setMessage(null);
    setDrawer({
      id: null,
      input: {
        title: "",
        description: "",
        sessionType: "talk",
        isFeatured: false,
        trackId: null,
        hallId: null,
        speakerIds: [],
        speakerText: "",
        tba: false,
        date: day?.date ?? "",
        startTime: day ? hhmm(Math.max(day.window.open, 9 * 60) % (24 * 60)) : "09:00",
        durationMin: DEFAULT_DURATION,
        ...preset,
      },
    });
  }

  function openEdit(s: AgendaSession) {
    if (!canEdit) return;
    setMessage(null);
    setDrawer({
      id: s.id,
      input: {
        title: s.title,
        description: s.description ?? "",
        sessionType: s.sessionType,
        isFeatured: s.isFeatured,
        trackId: s.trackId,
        hallId: s.hallId,
        speakerIds: s.speakerIds,
        speakerText: s.speakerText ?? "",
        tba: !s.slot,
        date: s.slot?.date ?? day?.date ?? "",
        startTime: s.slot?.startTime ?? "09:00",
        durationMin: s.slot ? s.slot.endMin - s.slot.startMin : DEFAULT_DURATION,
      },
    });
  }

  const sessionMeta = (s: AgendaSession) =>
    [s.hallId ? hallName.get(s.hallId) : null, [...s.speakerIds.map((id) => speakerName.get(id)).filter(Boolean), s.speakerText].filter(Boolean).join(", ")]
      .filter(Boolean)
      .join(" · ");

  if (days.length === 0) return <p className="text-muted-foreground">Set the event dates first.</p>;

  return (
    <div className="space-y-4">
      {message && (
        <p role="alert" className={cn("rounded-md px-3 py-2 text-sm", message.tone === "error" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-foreground")}>
          {message.text}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="View" className="inline-flex rounded-lg border p-0.5">
          {([["schedule", "Schedule", CalendarDays], ["list", "All sessions", List]] as const).map(([v, label, Icon]) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", view === v ? "bg-primary/10 font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </button>
          ))}
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondarySm} onClick={() => setSettingsOpen(true)}>
              <Settings2 aria-hidden /> Tracks &amp; halls
            </button>
            <button type="button" className={btnPrimary} onClick={() => openNew()}>
              <Plus aria-hidden /> Add session
            </button>
          </div>
        )}
      </div>

      {tba.length > 0 && (
        <details className="rounded-xl border border-dashed bg-card p-3" open={view === "schedule"}>
          <summary className="cursor-pointer text-sm font-medium">Sessions not scheduled yet ({tba.length})</summary>
          <ul className="mt-3 flex flex-wrap gap-2">
            {tba.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => openEdit(s)}
                  className="rounded-lg border bg-background px-3 py-1.5 text-left text-sm enabled:hover:border-primary/50"
                >
                  <span className="font-medium">{s.title}</span>
                  <span className="block text-xs text-muted-foreground">{sessionTypeLabel(s.sessionType)} · time TBA{canEdit && " · click to schedule"}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {view === "schedule" ? (
        <>
          {days.length > 1 && (
            <div role="tablist" aria-label="Event day" className="flex gap-1 overflow-x-auto border-b">
              {days.map((d, i) => {
                const n = scheduled.filter((s) => s.slot!.date === d.date).length;
                return (
                  <button
                    key={d.date}
                    role="tab"
                    aria-selected={i === dayIdx}
                    onClick={() => setDayIdx(i)}
                    className={cn("-mb-px shrink-0 border-b-2 px-3 py-2 text-left text-sm", i === dayIdx ? "border-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}
                  >
                    {d.short}
                    <span className="block text-xs font-normal text-muted-foreground">{d.label.split(", ").slice(1).join(", ") || d.label}{n ? ` · ${n}` : ""}</span>
                  </button>
                );
              })}
            </div>
          )}
          <DayGrid
            day={day}
            sessions={scheduled.filter((s) => s.slot!.date === day.date)}
            tracks={tracks}
            canEdit={canEdit}
            meta={sessionMeta}
            onSlot={(startMin, trackId) => openNew({ date: day.date, startTime: hhmm(startMin), trackId })}
            onOpen={openEdit}
          />
          {canEdit && <p className="text-xs text-muted-foreground">Click an empty slot to add a session there, or a session to edit it.</p>}
        </>
      ) : (
        <SessionList days={days} sessions={sessions} meta={sessionMeta} trackName={trackName} canEdit={canEdit} onOpen={openEdit} />
      )}

      {canEdit && (
        <SessionDrawer
          key={drawer ? `${drawer.id ?? "new"}-${drawer.input.date}-${drawer.input.startTime}-${drawer.input.trackId}` : "closed"}
          state={drawer}
          days={days}
          tracks={tracks}
          halls={halls}
          speakers={speakers}
          eventId={eventId}
          pending={pending}
          error={message?.tone === "error" ? message.text : null}
          onClose={() => setDrawer(null)}
          onSave={(input) => run(() => saveSession(eventId, drawer!.id, input), () => setDrawer(null))}
          onDelete={async () => {
            if (!drawer?.id || !(await confirm({ title: "Delete this session?", confirmLabel: "Delete", destructive: true }))) return;
            run(() => deleteSession(eventId, drawer.id!), () => setDrawer(null));
          }}
        />
      )}

      {canEdit && (
        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader className="border-b">
              <SheetTitle>Tracks &amp; halls</SheetTitle>
            </SheetHeader>
            <div className="space-y-8 px-4 pb-6">
              <NamedList
                title="Tracks"
                hint="Tracks become columns in the schedule, e.g. Main stage, Workshops. Sessions set to “All tracks” span every column."
                items={tracks}
                pending={pending}
                onAdd={(name) => run(() => saveTrack(eventId, null, name))}
                onRename={(id, name) => run(() => saveTrack(eventId, id, name))}
                onDelete={async (t) => {
                  if (await confirm({ title: `Delete the track “${t.name}”?`, confirmLabel: "Delete", destructive: true })) run(() => deleteTrack(eventId, t.id));
                }}
              />
              <NamedList
                title="Halls"
                hint="Rooms or stages where sessions happen. Deleting a hall marks its sessions as “hall TBA”."
                items={halls}
                pending={pending}
                onAdd={(name) => run(() => saveHall(eventId, null, name))}
                onRename={(id, name) => run(() => saveHall(eventId, id, name))}
                onDelete={async (h) => {
                  if (await confirm({ title: `Delete the hall “${h.name}”?`, confirmLabel: "Delete", destructive: true })) run(() => deleteHall(eventId, h.id));
                }}
              />
              {message?.tone === "error" && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{message.text}</p>}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function DayGrid({
  day,
  sessions,
  tracks,
  canEdit,
  meta,
  onSlot,
  onOpen,
}: {
  day: AgendaDay;
  sessions: AgendaSession[];
  tracks: Track[];
  canEdit: boolean;
  meta: (s: AgendaSession) => string;
  onSlot: (startMin: number, trackId: string | null) => void;
  onOpen: (s: AgendaSession) => void;
}) {
  const range = gridRange(day.window, sessions.map((s) => s.slot!));
  const height = (range.end - range.start) * PX_PER_MIN;
  const y = (min: number) => (min - range.start) * PX_PER_MIN;
  const hours: number[] = [];
  for (let m = range.start; m < range.end; m += 60) hours.push(m);
  const slots: number[] = [];
  for (let m = Math.max(range.start, Math.ceil(day.window.open / SLOT_MIN) * SLOT_MIN); m + SLOT_MIN <= Math.min(range.end, day.window.close); m += SLOT_MIN) slots.push(m);

  const columns: { id: string | null; name: string }[] = tracks.length ? tracks : [{ id: null, name: "Sessions" }];
  const common = tracks.length ? sessions.filter((s) => !s.trackId) : [];
  const commonLanes = layoutLanes(common.map((s) => ({ id: s.id, ...s.slot! })));

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <div className="min-w-fit">
        <div className="sticky top-0 z-20 flex border-b bg-card">
          <div className="w-16 shrink-0" />
          {columns.map((c) => (
            <div key={c.id ?? "all"} className="w-56 shrink-0 border-l px-3 py-2 text-sm font-medium sm:w-auto sm:min-w-56 sm:flex-1">{c.name}</div>
          ))}
        </div>
        <div className="relative flex" style={{ height }}>
          <div className="relative w-16 shrink-0">
            {hours.map((m) => (
              <span key={m} className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground tabular-nums" style={{ top: y(m) }}>
                {m === range.start ? "" : formatClock(m)}
              </span>
            ))}
          </div>
          {columns.map((c) => {
            const mine = tracks.length ? sessions.filter((s) => s.trackId === c.id) : sessions;
            const lanes = layoutLanes(mine.map((s) => ({ id: s.id, ...s.slot! })));
            return (
              <div key={c.id ?? "all"} className="relative w-56 shrink-0 border-l sm:w-auto sm:min-w-56 sm:flex-1">
                {hours.map((m) => <div key={m} aria-hidden className="absolute inset-x-0 border-t border-border/60" style={{ top: y(m) }} />)}
                <div aria-hidden className="absolute inset-x-0 bg-muted/50" style={{ top: 0, height: Math.max(0, y(day.window.open)) }} />
                <div aria-hidden className="absolute inset-x-0 bottom-0 bg-muted/50" style={{ top: Math.min(height, y(day.window.close)) }} />
                {canEdit &&
                  slots.map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-label={`Add session at ${formatClock(m)}${c.id ? ` in ${c.name}` : ""}`}
                      onClick={() => onSlot(m, c.id)}
                      className="group absolute inset-x-0 flex items-start justify-end px-2 pt-1 text-xs text-primary opacity-0 hover:bg-primary/5 hover:opacity-100 focus-visible:opacity-100"
                      style={{ top: y(m), height: SLOT_MIN * PX_PER_MIN }}
                    >
                      + {formatClock(m)}
                    </button>
                  ))}
                {mine.map((s) => {
                  const l = lanes.get(s.id)!;
                  return <Block key={s.id} s={s} meta={meta(s)} top={y(s.slot!.startMin)} height={(s.slot!.endMin - s.slot!.startMin) * PX_PER_MIN} lane={l} canEdit={canEdit} onOpen={onOpen} />;
                })}
              </div>
            );
          })}
          {common.length > 0 && (
            <div className="pointer-events-none absolute inset-y-0 right-0 left-16">
              {common.map((s) => (
                <Block key={s.id} s={s} meta={meta(s)} top={y(s.slot!.startMin)} height={(s.slot!.endMin - s.slot!.startMin) * PX_PER_MIN} lane={commonLanes.get(s.id)!} canEdit={canEdit} onOpen={onOpen} spanning />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Block({
  s,
  meta,
  top,
  height,
  lane,
  canEdit,
  onOpen,
  spanning,
}: {
  s: AgendaSession;
  meta: string;
  top: number;
  height: number;
  lane: { lane: number; lanes: number };
  canEdit: boolean;
  onOpen: (s: AgendaSession) => void;
  spanning?: boolean;
}) {
  const quiet = s.sessionType === "break" || s.sessionType === "networking";
  const width = 100 / lane.lanes;
  const compact = height < 44;
  return (
    <button
      type="button"
      disabled={!canEdit}
      onClick={() => onOpen(s)}
      title={`${s.title} · ${formatClock(s.slot!.startMin)}–${formatClock(s.slot!.endMin)}`}
      className={cn(
        "pointer-events-auto absolute z-10 overflow-hidden rounded-md border px-2 py-1 text-left text-xs shadow-sm enabled:hover:ring-2 enabled:hover:ring-primary/40",
        quiet ? "border-dashed bg-muted text-muted-foreground" : "border-primary/30 bg-[color-mix(in_oklch,var(--primary)_12%,var(--card))]",
        spanning && "z-[5]"
      )}
      style={{ top: top + 1, height: Math.max(height - 2, 20), left: `calc(${lane.lane * width}% + 3px)`, width: `calc(${width}% - 6px)` }}
    >
      <span className={cn("flex items-center gap-1 font-medium text-foreground", compact && "truncate")}>
        {s.isFeatured && <Star className="size-3 shrink-0 fill-primary text-primary" aria-label="Featured" />}
        <span className="truncate">{s.title}</span>
      </span>
      {!compact && (
        <>
          <span className="block truncate text-muted-foreground tabular-nums">
            {formatClock(s.slot!.startMin)}–{formatClock(s.slot!.endMin)} · {sessionTypeLabel(s.sessionType)}{spanning ? " · All tracks" : ""}
          </span>
          {meta && height >= 64 && <span className="block truncate text-muted-foreground">{meta}</span>}
        </>
      )}
    </button>
  );
}

function SessionList({
  days,
  sessions,
  meta,
  trackName,
  canEdit,
  onOpen,
}: {
  days: AgendaDay[];
  sessions: AgendaSession[];
  meta: (s: AgendaSession) => string;
  trackName: Map<string, string>;
  canEdit: boolean;
  onOpen: (s: AgendaSession) => void;
}) {
  if (sessions.length === 0) return <div className="rounded-xl bg-card p-8 text-center text-muted-foreground shadow-sm">No sessions yet.</div>;
  const groups = [
    ...days.map((d) => ({ key: d.date, label: days.length > 1 ? `${d.short} · ${d.label}` : d.label, items: sessions.filter((s) => s.slot?.date === d.date).sort((a, b) => a.slot!.startMin - b.slot!.startMin) })),
    { key: "tba", label: "Time to be announced", items: sessions.filter((s) => !s.slot) },
  ].filter((g) => g.items.length);
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.key} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{g.label}</h3>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {g.items.map((s) => (
              <li key={s.id}>
                <button type="button" disabled={!canEdit} onClick={() => onOpen(s)} className="flex w-full flex-wrap gap-x-4 gap-y-1 p-3 text-left text-sm enabled:hover:bg-muted/50">
                  <span className="w-40 shrink-0 text-muted-foreground tabular-nums">
                    {s.slot ? `${formatClock(s.slot.startMin)}–${formatClock(s.slot.endMin)}` : "TBA"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 font-medium">
                      {s.isFeatured && <Star className="size-3.5 fill-primary text-primary" aria-label="Featured" />}
                      {s.title}
                    </span>
                    <span className="block text-muted-foreground">
                      {[sessionTypeLabel(s.sessionType), s.trackId ? trackName.get(s.trackId) : null, meta(s)].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SessionDrawer({
  state,
  days,
  tracks,
  halls,
  speakers,
  eventId,
  pending,
  error,
  onClose,
  onSave,
  onDelete,
}: {
  state: { id: string | null; input: SessionInput } | null;
  days: AgendaDay[];
  tracks: Track[];
  halls: Hall[];
  speakers: Speaker[];
  eventId: string;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: SessionInput) => void;
  onDelete: () => void;
}) {
  const [f, setF] = useState<SessionInput | null>(state?.input ?? null);
  const set = <K extends keyof SessionInput>(k: K, v: SessionInput[K]) => setF((x) => (x ? { ...x, [k]: v } : x));
  const day = days.find((d) => d.date === f?.date);
  const endMin = f ? minutesOf(f.startTime || "00:00") + f.durationMin : 0;

  return (
    <Sheet open={!!state} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{state?.id ? "Edit session" : "Add session"}</SheetTitle>
        </SheetHeader>
        {f && (
          <form
            className="space-y-4 px-4 pb-6"
            onSubmit={(e) => {
              e.preventDefault();
              onSave(f);
            }}
          >
            <label className="block space-y-1 text-sm font-medium">Title *
              <input className={inputCls} required maxLength={TITLE_MAX} value={f.title} onChange={(e) => set("title", e.target.value)} autoFocus />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1 text-sm font-medium">Session type
                <select className={inputCls} value={f.sessionType} onChange={(e) => set("sessionType", e.target.value as SessionInput["sessionType"])}>
                  {SESSION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input type="checkbox" checked={f.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} /> Feature this session
              </label>
            </div>

            <fieldset className="space-y-3 rounded-lg border p-3">
              <legend className="px-1 text-sm font-medium">When</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={f.tba} onChange={(e) => set("tba", e.target.checked)} /> Time to be announced
              </label>
              {!f.tba && (
                <>
                  <label className="block space-y-1 text-sm">Day
                    <select className={inputCls} value={f.date} onChange={(e) => set("date", e.target.value)}>
                      {days.map((d) => <option key={d.date} value={d.date}>{days.length > 1 ? `${d.short} · ` : ""}{d.label}</option>)}
                    </select>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="col-span-1 block space-y-1 text-sm">Start
                      <input type="time" className={inputCls} value={f.startTime} onChange={(e) => set("startTime", e.target.value)} required />
                    </label>
                    <label className="block space-y-1 text-sm">Hours
                      <select className={inputCls} value={Math.floor(f.durationMin / 60)} onChange={(e) => set("durationMin", Number(e.target.value) * 60 + (f.durationMin % 60))}>
                        {Array.from({ length: 13 }, (_, h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </label>
                    <label className="block space-y-1 text-sm">Minutes
                      <select className={inputCls} value={f.durationMin % 60} onChange={(e) => set("durationMin", Math.floor(f.durationMin / 60) * 60 + Number(e.target.value))}>
                        {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </label>
                  </div>
                  {f.startTime && f.durationMin >= 5 && (
                    <p className="text-xs text-muted-foreground">
                      {formatClock(minutesOf(f.startTime))} – {formatClock(endMin % (24 * 60))} ({formatDuration(f.durationMin)})
                      {day && (minutesOf(f.startTime) < day.window.open || endMin > day.window.close) && (
                        <span className="block text-destructive">This is outside the event&apos;s hours for that day ({formatClock(day.window.open)} – {formatClock(day.window.close % (24 * 60))}).</span>
                      )}
                    </p>
                  )}
                </>
              )}
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm font-medium">Hall
                <select className={inputCls} value={f.hallId ?? ""} onChange={(e) => set("hallId", e.target.value || null)}>
                  <option value="">To be announced</option>
                  {halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </label>
              {tracks.length > 0 && (
                <label className="block space-y-1 text-sm font-medium">Track
                  <select className={inputCls} value={f.trackId ?? ""} onChange={(e) => set("trackId", e.target.value || null)}>
                    <option value="">All tracks</option>
                    {tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </label>
              )}
            </div>

            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Speakers</legend>
              {speakers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No speakers yet. <Link href={`/dashboard/events/${eventId}/speakers`} className="underline">Add speakers</Link>, then assign them here.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {speakers.map((sp) => {
                    const on = f.speakerIds.includes(sp.id);
                    return (
                      <label key={sp.id} title={sp.detail || undefined} className={cn("cursor-pointer rounded-full border px-3 py-1 text-sm has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50", on ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground hover:text-foreground")}>
                        <input type="checkbox" className="sr-only" checked={on} onChange={() => set("speakerIds", on ? f.speakerIds.filter((x) => x !== sp.id) : [...f.speakerIds, sp.id])} />
                        {sp.name}
                      </label>
                    );
                  })}
                </div>
              )}
              {f.speakerText && (
                <label className="block space-y-1 pt-1 text-xs text-muted-foreground">Speaker (old text field — clear it once the speaker is added above)
                  <input className={inputCls} value={f.speakerText} onChange={(e) => set("speakerText", e.target.value)} />
                </label>
              )}
            </fieldset>

            <label className="block space-y-1 text-sm font-medium">Description
              <textarea className={inputCls} rows={4} value={f.description} onChange={(e) => set("description", e.target.value)} />
            </label>

            {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Saving..." : "Save session"}</button>
              <button type="button" onClick={onClose} disabled={pending} className={btnSecondary}>Cancel</button>
              {state?.id && (
                <button type="button" onClick={onDelete} disabled={pending} className="ml-auto text-sm text-destructive underline">Delete</button>
              )}
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

function NamedList({
  title,
  hint,
  items,
  pending,
  onAdd,
  onRename,
  onDelete,
}: {
  title: string;
  hint: string;
  items: { id: string; name: string }[];
  pending: boolean;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (item: { id: string; name: string }) => void;
}) {
  const [draft, setDraft] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  return (
    <section className="space-y-2">
      <h3 className="font-medium">{title}</h3>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <ul className="divide-y rounded-lg border">
        {items.length === 0 && <li className="p-3 text-sm text-muted-foreground">None yet.</li>}
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-2 p-2 text-sm">
            {renaming?.id === it.id ? (
              <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); onRename(it.id, renaming.name); setRenaming(null); }}>
                <input className={inputCls} maxLength={NAME_MAX} value={renaming.name} onChange={(e) => setRenaming({ id: it.id, name: e.target.value })} autoFocus aria-label={`Rename ${it.name}`} />
                <button type="submit" disabled={pending} className={btnSecondarySm}>Save</button>
              </form>
            ) : (
              <>
                <span className="flex-1 truncate">{it.name}</span>
                <button type="button" className="text-xs underline" onClick={() => setRenaming({ id: it.id, name: it.name })}>Rename</button>
                <button type="button" disabled={pending} className="text-xs text-destructive underline" onClick={() => onDelete(it)}>Delete</button>
              </>
            )}
          </li>
        ))}
      </ul>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { onAdd(draft); setDraft(""); } }}>
        <input className={inputCls} maxLength={NAME_MAX} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Add ${title.toLowerCase().slice(0, -1)}`} aria-label={`New ${title.toLowerCase().slice(0, -1)} name`} />
        <button type="submit" disabled={pending || !draft.trim()} className={btnSecondarySm}>Add</button>
      </form>
    </section>
  );
}
