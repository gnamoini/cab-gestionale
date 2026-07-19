import { NextResponse } from "next/server";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { runDeliveryWorker } from "@/lib/notifications/delivery/worker/delivery-worker.server";
import { runPushDeliveryProcess } from "@/lib/pwa/push-delivery-process.server";
import { resolveNotificationsSsotV2Mode } from "@/lib/notifications/notifications-ssot-v2-flag";

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

async function handleCron(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ssotMode = resolveNotificationsSsotV2Mode();
  if (ssotMode === "on" || ssotMode === "shadow") {
    const result = await runDeliveryWorker();
    return NextResponse.json({ pipeline: "ssot_v4", ...result });
  }

  const result = await runPushDeliveryProcess();
  return NextResponse.json({ pipeline: "legacy_push", ...result });
}

/** Vercel Cron (GET + CRON_SECRET) o invocazione manuale POST con service role. */
export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
