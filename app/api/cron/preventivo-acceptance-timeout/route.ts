import { NextResponse } from "next/server";
import { runPreventivoAcceptanceTimeoutBatch } from "@/lib/preventivi/preventivo-acceptance-timeout.server";
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
  const result = await runPreventivoAcceptanceTimeoutBatch();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
