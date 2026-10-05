import { NextResponse } from "next/server";
import type { EventRow } from "@/lib/events";
import { ADMIN_ROLES, getEventRole } from "@/lib/event-access";
import { parseFilter, queryGuests, sanitizeSearch } from "@/lib/guests";
import { UUID_RE } from "@/lib/registration";
import { createClient } from "@/utils/supabase/server";

function cell(value: string | null | undefined): string {
  let s = value ?? "";
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return new NextResponse("Not found", { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return new NextResponse("Unauthorized", { status: 401 });

  const role = await getEventRole(supabase, id);
  if (!role || !ADMIN_ROLES.includes(role)) return new NextResponse("Forbidden", { status: 403 });

  const { data: eventData } = await supabase.from("events").select("slug").eq("id", id).maybeSingle();
  const event = eventData as Pick<EventRow, "slug"> | null;
  if (!event) return new NextResponse("Not found", { status: 404 });

  const url = new URL(request.url);
  const { rows, error } = await queryGuests(
    supabase,
    id,
    sanitizeSearch(url.searchParams.get("q") ?? undefined),
    parseFilter(url.searchParams.get("status") ?? undefined),
    10000
  );
  if (error) return new NextResponse("Could not export guests", { status: 500 });

  const header = ["First Name", "Last Name", "Email", "Phone", "Company", "Job Title", "Status", "Ticket Code", "Registered At", "Checked In At"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.first_name,
        r.last_name,
        r.email,
        r.phone,
        r.company_name,
        r.job_title,
        r.status,
        r.ticket_code,
        r.created_at,
        r.checked_in_at,
      ]
        .map((v) => cell(v as string | null))
        .join(",")
    );
  }

  return new NextResponse("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}-guests.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
