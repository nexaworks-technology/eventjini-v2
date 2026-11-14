"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TicketImage = { eventTitle: string; date: string; time: string; location: string | null; attendee: string; code: string; qrDataUrl: string };

const W = 720;
const PAD = 56;
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+\S*$/, "")}…`;
  }
  return lines;
}

/** Draws the ticket onto a canvas and saves it as a PNG, so attendees have it offline. */
async function render(t: TicketImage): Promise<Blob | null> {
  const qr = new Image();
  qr.src = t.qrDataUrl;
  await qr.decode();

  const canvas = document.createElement("canvas");
  const scale = 2;
  const measure = canvas.getContext("2d")!;
  measure.font = `700 40px ${FONT}`;
  const titleLines = wrap(measure, t.eventTitle, W - PAD * 2, 3);
  const infoLines = [t.date, t.time, t.location].filter(Boolean) as string[];
  const H = PAD + titleLines.length * 50 + 16 + infoLines.length * 34 + 48 + 40 + 44 + 24 + 400 + 24 + 40 + PAD;

  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "top";

  let y = PAD;
  ctx.fillStyle = "#111111";
  ctx.font = `700 40px ${FONT}`;
  for (const l of titleLines) { ctx.fillText(l, PAD, y); y += 50; }
  y += 16;
  ctx.fillStyle = "#555555";
  ctx.font = `400 26px ${FONT}`;
  for (const l of infoLines) { ctx.fillText(wrap(ctx, l, W - PAD * 2, 1)[0], PAD, y); y += 34; }

  y += 24;
  ctx.strokeStyle = "#cccccc";
  ctx.setLineDash([10, 8]);
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
  ctx.setLineDash([]);
  y += 24;

  ctx.textAlign = "center";
  ctx.fillStyle = "#777777";
  ctx.font = `600 20px ${FONT}`;
  ctx.fillText("ATTENDEE", W / 2, y); y += 40;
  ctx.fillStyle = "#111111";
  ctx.font = `700 32px ${FONT}`;
  ctx.fillText(wrap(ctx, t.attendee, W - PAD * 2, 1)[0], W / 2, y); y += 44 + 24;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, (W - 400) / 2, y, 400, 400); y += 400 + 24;

  ctx.fillStyle = "#111111";
  ctx.font = `600 28px ui-monospace, Menlo, monospace`;
  ctx.fillText(t.code, W / 2, y);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export function DownloadTicketButton(props: TicketImage) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function save() {
    setBusy(true);
    setFailed(false);
    try {
      const blob = await render(props);
      if (!blob) throw new Error("render failed");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ticket-${props.code}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <button type="button" onClick={save} disabled={busy} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 w-full")}>
        <Download aria-hidden /> {busy ? "Preparing..." : "Save ticket as image"}
      </button>
      {failed && <p role="alert" className="text-center text-sm text-destructive">Couldn&apos;t create the image. Take a screenshot instead.</p>}
    </div>
  );
}
