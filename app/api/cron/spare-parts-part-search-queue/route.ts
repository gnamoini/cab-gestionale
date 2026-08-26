import { NextResponse } from "next/server";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { processPartSearchQueueOnly } from "@/lib/ai/spare-parts/workers/spare-parts-worker.server";
import { createClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";

export const runtime = "nodejs";
export const maxDuration = 300;

function createWorkerClient() {
  const serviceKey = readSupabaseServiceRoleKey();
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY assente");
  const { url } = assertSupabasePublicEnv();
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function authorize(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  const serviceKey = readSupabaseServiceRoleKey();
  return Boolean(serviceKey && auth === `Bearer ${serviceKey}`);
}

export async function POST(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sb = createWorkerClient();
  const claimed = await processPartSearchQueueOnly(sb);
  return NextResponse.json({ partSearchClaimed: claimed });
}

export async function GET(request: Request) {
  return POST(request);
}
