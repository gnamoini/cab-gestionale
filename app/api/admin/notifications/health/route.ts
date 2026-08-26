import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { assertSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { verifyServerIsAdmin } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function GET() {
  const canManage = await verifyServerIsAdmin();
  if (!canManage) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const serviceKey = assertSupabaseServiceRoleKey();
  const { url } = assertSupabasePublicEnv();
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = Date.now();

  const { count: rawPending } = await client
    .from("delivery_queue")
    .select("*", { count: "exact", head: true })
    .eq("job_phase", "raw")
    .in("status", ["pending", "failed"]);

  const { count: execPending } = await client
    .from("delivery_queue")
    .select("*", { count: "exact", head: true })
    .eq("job_phase", "executive")
    .in("status", ["pending", "failed"]);

  const { data: oldestRaw } = await client
    .from("delivery_queue")
    .select("created_at")
    .eq("job_phase", "raw")
    .in("status", ["pending", "failed"])
    .order("created_at", { ascending: true })
    .limit(1);

  const queueAgeMs = oldestRaw?.[0]?.created_at
    ? now - new Date(String(oldestRaw[0].created_at)).getTime()
    : 0;

  const { count: activeSubs } = await client
    .from("push_subscriptions")
    .select("*", { count: "exact", head: true })
    .is("revoked_at", null);

  const { count: captureCount } = await client
    .from("notification_capture_log")
    .select("*", { count: "exact", head: true });

  const { data: deliveryStats } = await client
    .from("notification_delivery")
    .select("status, provider, provider_ms, dispatch_ms, render_ms")
    .gte("created_at", new Date(now - 24 * 60 * 60 * 1000).toISOString())
    .limit(5000);

  const rows = deliveryStats ?? [];
  const delivered = rows.filter((r) => r.status === "delivered").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const avgProviderMs =
    rows.reduce((s, r) => s + (Number(r.provider_ms) || 0), 0) / Math.max(rows.length, 1);
  const avgDispatchMs =
    rows.reduce((s, r) => s + (Number(r.dispatch_ms) || 0), 0) / Math.max(rows.length, 1);
  const avgRenderMs =
    rows.reduce((s, r) => s + (Number(r.render_ms) || 0), 0) / Math.max(rows.length, 1);

  const { count: outboxPending } = await client
    .from("notification_outbox")
    .select("*", { count: "exact", head: true })
    .in("status", ["pending", "processing"]);

  const { count: outboxFailed } = await client
    .from("notification_outbox")
    .select("*", { count: "exact", head: true })
    .eq("status", "failed");

  const { data: recentWorkerDiag } = await client
    .from("notification_worker_diagnostics")
    .select("worker_name, status, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: recentPipelineTrace } = await client
    .from("notification_pipeline_trace")
    .select("trace_id, stage, notification_event_id, recipient_count, notifications_created, error, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const { count: pipelineTrace24h } = await client
    .from("notification_pipeline_trace")
    .select("*", { count: "exact", head: true })
    .gte("created_at", new Date(now - 24 * 60 * 60 * 1000).toISOString());

  const { data: traceStats } = await client
    .from("notification_pipeline_trace")
    .select("stage, created_at")
    .gte("created_at", new Date(now - 24 * 60 * 60 * 1000).toISOString())
    .limit(5000);

  const traceRows = traceStats ?? [];
  const dispatchTraces = traceRows.filter((r) => r.stage === "dispatch");
  const persistTraces = traceRows.filter((r) => r.stage === "persist");
  const clientAckTraces = traceRows.filter((r) => r.stage === "client_ack");
  const pushDelivered = rows.filter((r) => r.status === "delivered" && r.provider === "webpush");
  const pushFailed = rows.filter((r) => r.status === "failed" && r.provider === "webpush");

  return NextResponse.json({
    ok: true,
    queue: {
      rawPending: rawPending ?? 0,
      executivePending: execPending ?? 0,
      queueAgeMs,
    },
    outbox: {
      pending: outboxPending ?? 0,
      failed: outboxFailed ?? 0,
    },
    workerDiagnostics: recentWorkerDiag ?? [],
    pipelineTrace: {
      recent: recentPipelineTrace ?? [],
      last24h: pipelineTrace24h ?? 0,
    },
    devices: { activeSubscriptions: activeSubs ?? 0 },
    delivery24h: {
      sampleSize: rows.length,
      delivered,
      failed,
      deliveryRate: rows.length ? delivered / rows.length : null,
      avgProviderMs: Math.round(avgProviderMs),
      avgDispatchMs: Math.round(avgDispatchMs),
      avgRenderMs: Math.round(avgRenderMs),
      pushSuccessRate:
        pushDelivered.length + pushFailed.length > 0
          ? pushDelivered.length / (pushDelivered.length + pushFailed.length)
          : null,
      realtimeSuccessRate:
        clientAckTraces.length > 0 && persistTraces.length > 0
          ? clientAckTraces.length / persistTraces.length
          : null,
    },
    pipeline24h: {
      dispatchEvents: dispatchTraces.length,
      persistEvents: persistTraces.length,
      clientAckEvents: clientAckTraces.length,
    },
    captureLogTotal: captureCount ?? 0,
    workerSaturation: null,
    generatedAt: new Date().toISOString(),
  });
}
