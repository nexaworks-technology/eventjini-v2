import { NextResponse } from "next/server";
import { UUID_RE } from "@/lib/registration";
import { createClient } from "@/utils/supabase/server";

/** RFC 8058 one-click unsubscribe: mail providers POST here. GET never changes anything. */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!UUID_RE.test(token)) return new NextResponse(null, { status: 404 });
  const supabase = await createClient();
  const { data } = await supabase.rpc("set_email_opt_out", { p_token: token, p_opt_out: true });
  return new NextResponse(null, { status: data ? 200 : 404 });
}
