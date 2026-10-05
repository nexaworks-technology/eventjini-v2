import { CheckCircle2, Medal, Users } from "lucide-react";

/* Illustrative product compositions built in markup, with obviously sample data. Decorative only. */

const SIDE = ["Overview", "Event Details", "Registrations", "Attendees", "Check-in", "Sponsors", "Broadcasts", "Analytics", "Budget", "Vendors", "Settings"];

function Side({ active, items = SIDE }: { active: string; items?: string[] }) {
  return (
    <div className="hidden w-32 shrink-0 space-y-0.5 border-r p-2.5 sm:block">
      <p className="px-1.5 pb-2 font-heading text-[11px] font-bold">Event<span className="text-primary">Jini</span></p>
      {items.map((x) => (
        <p key={x} className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-[9px] ${x === active ? "bg-foreground font-medium text-background" : "text-muted-foreground"}`}>
          <span className="size-1.5 rounded-sm bg-current opacity-60" />
          {x}
        </p>
      ))}
    </div>
  );
}

export function DashboardMock() {
  const line = "M0,60 C20,58 30,50 45,48 C60,46 70,40 85,30 C100,22 110,24 125,16 C140,10 150,12 160,6";
  return (
    <div role="img" aria-label="Illustrative dashboard preview with sample data" className="mx-auto w-full max-w-xl">
      <div className="rounded-t-2xl border-[6px] border-foreground/90 bg-card shadow-2xl">
        <div className="flex">
          <Side active="Overview" />
          <div className="min-w-0 flex-1 space-y-3 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold">Sample Summit <span className="rounded bg-success/15 px-1 text-[8px] text-success">Live</span></p>
                <p className="text-[8px] text-muted-foreground">Sample date · Sample city</p>
              </div>
              <span className="rounded border px-1.5 py-0.5 text-[8px]">View Event Page</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[["Registrations", "1,248", ""], ["Checked in", "892", "text-success"], ["Approval pending", "56", "text-primary"], ["Total attendees", "1,180", ""]].map(([k, v, c]) => (
                <div key={k} className="rounded border p-1.5">
                  <p className="text-[7px] text-muted-foreground">{k}</p>
                  <p className={`text-sm font-semibold tabular-nums ${c}`}>{v}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[1.6fr_1fr] gap-1.5">
              <div className="rounded border p-2">
                <p className="text-[8px] font-medium">Registrations</p>
                <svg viewBox="0 0 160 70" className="mt-1 h-20 w-full" aria-hidden>
                  <path d={`${line} L160,70 L0,70 Z`} className="fill-primary/10" />
                  <path d={line} className="fill-none stroke-primary" strokeWidth="1.6" />
                </svg>
              </div>
              <div className="rounded border p-2">
                <p className="text-[8px] font-medium">Check-in status</p>
                <div className="mt-2 flex justify-center">
                  <svg viewBox="0 0 36 36" className="size-16" aria-hidden>
                    <circle cx="18" cy="18" r="14" fill="none" strokeWidth="5" className="stroke-muted" />
                    <circle cx="18" cy="18" r="14" fill="none" strokeWidth="5" strokeDasharray="63 88" strokeLinecap="round" transform="rotate(-90 18 18)" className="stroke-success" />
                    <text x="18" y="20" textAnchor="middle" className="fill-foreground text-[7px] font-bold">72%</text>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto h-2.5 w-[108%] -translate-x-[3.7%] rounded-b-xl bg-gradient-to-b from-muted-foreground/40 to-muted-foreground/15" aria-hidden />
      <p className="mt-3 text-right text-xs text-muted-foreground">Illustrative preview · sample data</p>
    </div>
  );
}

function Frame({ children, active, title, action, items }: { children: React.ReactNode; active: string; title: string; action: string; items?: string[] }) {
  return (
    <div role="img" aria-label={`Illustrative ${title} preview with sample data`} className="w-full overflow-hidden rounded-xl border bg-card shadow-lg">
      <div className="flex">
        <Side active={active} items={items} />
        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-center justify-between border-b pb-3">
            <p className="text-sm font-semibold">{title}</p>
            <span className="rounded bg-foreground px-2 py-1 text-[9px] font-medium text-background">{action}</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function FormMock() {
  const rows: [string, string][] = [["Full Name", "Short answer"], ["Email Address", "Email"], ["Company", "Short answer"], ["Designation", "Short answer"], ["Attending As", "Dropdown"]];
  return (
    <Frame active="Registrations" title="Registration Form" action="Save Changes" items={["Event Details", "Registrations", "Attendees", "Check-in", "Broadcasts", "Analytics", "Budget"]}>
      <div className="mt-2 flex gap-4 border-b text-[9px]">
        {["Form Builder", "Approval Rules", "Settings"].map((t, i) => (
          <span key={t} className={`pb-1.5 ${i === 0 ? "border-b-2 border-primary font-medium text-primary" : "text-muted-foreground"}`}>{t}</span>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {rows.map(([a, b]) => (
          <div key={a} className="grid grid-cols-2 gap-2 text-[9px]">
            <span className="rounded border px-2 py-1.5">{a}</span>
            <span className="rounded border px-2 py-1.5 text-muted-foreground">{b}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function SponsorMock() {
  const rows = [["Title Sponsor", "Main branding across event", "3 sponsors", Medal], ["Gold Sponsor", "Booth + logo placement", "5 sponsors", Medal], ["Silver Sponsor", "Booth space", "8 sponsors", Medal], ["Community Partner", "Logo on website", "12 sponsors", Users]] as const;
  return (
    <Frame active="Sponsors" title="Sponsors" action="Add Package" items={["Event Details", "Registrations", "Attendees", "Check-in", "Sponsors", "Broadcasts", "Analytics", "Vendors"]}>
      <div className="mt-2 flex gap-4 border-b text-[9px]">
        {["Sponsor Packages", "Leads", "Settings"].map((t, i) => (
          <span key={t} className={`pb-1.5 ${i === 0 ? "border-b-2 border-primary font-medium text-primary" : "text-muted-foreground"}`}>{t}</span>
        ))}
      </div>
      <div className="mt-2 divide-y">
        {rows.map(([n, d, c, Icon]) => (
          <div key={n} className="flex items-center gap-2 py-2">
            <span className="flex size-6 items-center justify-center rounded bg-primary/10 text-primary"><Icon className="size-3" aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium">{n}</p>
              <p className="truncate text-[8px] text-muted-foreground">{d}</p>
            </div>
            <span className="text-[8px] text-muted-foreground">{c}</span>
            <span className="rounded border px-1.5 py-0.5 text-[8px]">Edit</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

const QR = [
  "1111111010101111111", "1000001011001000001", "1011101001101011101", "1011101110001011101", "1011101010101011101", "1000001001001000001", "1111111010101111111",
  "0000000011100000000", "1101011100111010110", "0110100101010110010", "1011011010101101101", "0000000010011010010", "1111111001100110101", "1000001010110001010", "1011101111001110011", "1011101001010101100", "1011101100111010010", "1000001010001101001", "1111111011010110111",
];

export function CheckinMock() {
  return (
    <div role="img" aria-label="Illustrative check-in preview with sample data" className="relative mx-auto flex w-full max-w-xl items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-foreground to-foreground/80 p-6 sm:p-8">
      <div className="relative z-10 grid w-full grid-cols-[auto_1fr] items-center gap-5">
        <div className="w-28 rounded-[1.4rem] border-4 border-background/80 bg-background p-2.5 shadow-xl sm:w-32">
          <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-muted-foreground/30" />
          <div className="grid aspect-square grid-cols-[repeat(19,1fr)] gap-px rounded bg-white p-1">
            {QR.join("").split("").map((c, i) => <span key={i} className={c === "1" ? "bg-black" : "bg-white"} />)}
          </div>
          <p className="mt-2 text-center text-[8px] font-medium">Sample Attendee</p>
        </div>
        <div className="rounded-xl border-4 border-background/80 bg-background p-4 text-center shadow-xl">
          <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">SA</span>
          <p className="mt-2 text-sm font-semibold">Sample Attendee</p>
          <p className="text-[10px] text-muted-foreground">General ticket</p>
          <p className="mt-3 inline-flex items-center gap-1 rounded-md bg-success px-3 py-1.5 text-xs font-semibold text-white"><CheckCircle2 className="size-3.5" aria-hidden /> Checked in</p>
        </div>
      </div>
    </div>
  );
}


