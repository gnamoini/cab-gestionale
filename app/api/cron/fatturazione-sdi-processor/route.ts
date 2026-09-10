import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";

export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const serviceKey = readSupabaseServiceRoleKey();
  if (serviceKey && auth === `Bearer ${serviceKey}`) return true;
  const cronSecret = process.env.CRON_SECRET?.trim();
  return Boolean(cronSecret && auth === `Bearer ${cronSecret}`);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = readSupabaseServiceRoleKey();
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }
  const sb = createClient(url, key);
  const { processInvoiceSdiJob, reconcilePendingTransmissions } = await import(
    "@/lib/fatturazione/fe-sdi/sdi-job-processor.server"
  );
  const { data: jobs, error } = await sb.rpc("claim_invoice_sdi_jobs", { p_limit: 10, p_worker: "cron" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const results = [];
  for (const job of (jobs ?? []) as Array<{
    id: string;
    invoice_id: string;
    transmission_id?: string | null;
    idempotency_key: string;
    correlation_key: string;
    attempt_count: number;
  }>) {
    results.push(await processInvoiceSdiJob(sb as never, job));
  }
  const reconciled = await reconcilePendingTransmissions(sb as never);
  return NextResponse.json({ ok: true, processed: results.length, reconciled, results });
}

export async function GET(request: Request) {
  return POST(request);
}
