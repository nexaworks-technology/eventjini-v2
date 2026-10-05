import { NextResponse } from "next/server";
import { sanitizeSearch } from "@/lib/guests";
import { UUID_RE } from "@/lib/registration";
import { LEAD_COLUMNS, type Lead } from "@/lib/sponsors";
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

  const { data: sr } = await supabase
    .from("sponsor_registrations")
    .select("id,company_name")
    .eq("id", id)
    .eq("sponsor_user_id", user.id)
    .eq("status", "approved")
    .maybeSingle();
  if (!sr) return new NextResponse("Not found", { status: 404 });

  const q = sanitizeSearch(new URL(request.url).searchParams.get("q") ?? undefined);
  let query = supabase.from("sponsor_leads").select(LEAD_COLUMNS).eq("sponsor_registration_id", id).order("captured_at", { ascending: false }).limit(10000);
  if (q) {
    const p = `*${q}*`;
    query = query.or([`first_name.ilike.${p}`, `last_name.ilike.${p}`, `email.ilike.${p}`, `company_name.ilike.${p}`, `job_title.ilike.${p}`].join(","));
  }
  const { data, error } = await query;
  if (error) return new NextResponse("Could not export leads", { status: 500 });

  const lines = [["First Name", "Last Name", "Email", "Company", "Job Title", "Notes", "Captured At"].join(",")];
  for (const l of (data ?? []) as Lead[]) {
    lines.push([l.first_name, l.last_name, l.email, l.company_name, l.job_title, l.notes, l.captured_at].map(cell).join(","));
  }
  const slug = sr.company_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "sponsor";
  return new NextResponse("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-leads.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
