import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { assertSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { revokeStalePushSubscriptions } from "@/lib/pwa/push-subscription-manager.server";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";

export const runtime = "nodejs";

function isCronAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const serviceKey = readSupabaseServiceRoleKey();
  if (serviceKey && auth === `Bearer ${serviceKey}`) return true;
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  return false;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const serviceKey = assertSupabaseServiceRoleKey();
  const { url } = assertSupabasePublicEnv();
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const revoked = await revokeStalePushSubscriptions(client, 90);
  return NextResponse.json({ ok: true, revoked });
}

export async function POST(request: Request) {
  return GET(request);
}
