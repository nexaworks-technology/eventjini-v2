import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { cleanParam, normalizeSource, UTM_KEYS, VISITOR_COOKIE } from "@/lib/analytics";
import { UUID_RE } from "@/lib/registration";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ ok: false }, { status: 404 });

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const { data: event } = await admin
    .from("events")
    .select("id, slug")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (!event) return NextResponse.json({ ok: false }, { status: 404 });

  const existing = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = existing && UUID_RE.test(existing) ? existing : randomUUID();

  const path = cleanParam(body.path, 200);
  if (!path || path !== `/e/${event.slug}`) return NextResponse.json({ ok: false }, { status: 400 });

  const utm: Record<string, string | null> = {};
  for (const k of UTM_KEYS) utm[k] = cleanParam(body[k], 200);
  const referrer = cleanParam(body.referrer, 500);
  const host = request.headers.get("host") ?? "";

  const { error } = await admin.from("event_page_views").insert({
    event_id: id,
    visitor_id: visitorId,
    path,
    source: normalizeSource(utm.utm_source, referrer, host),
    ...utm,
    referrer,
  });
  if (error) return NextResponse.json({ ok: false }, { status: 500 });

  const response = NextResponse.json({ ok: true });
  if (visitorId !== existing) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
