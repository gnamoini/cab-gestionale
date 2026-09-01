/**
 * Fase 0 — Diagnostica pipeline notifiche (GO/NO-GO bloccante).
 *
 * Uso:
 *   npx tsx scripts/diagnose-notification-pipeline.ts --health
 *   npx tsx scripts/diagnose-notification-pipeline.ts <entity_id>
 *
 * Richiede SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
 */
import { createClient } from "@supabase/supabase-js";

const entityId = process.argv[2]?.trim();
const healthOnly = entityId === "--health";

function env(name: string): string {
  const direct = process.env[name]?.trim();
  if (direct) return direct;
  if (name === "SUPABASE_URL") {
    const pub = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    if (pub) return pub;
  }
  throw new Error(`Missing env: ${name}`);
}

type Checkpoint = {
  name: string;
  ok: boolean;
  detail: string;
};

type HealthReport = {
  outboxPending: number | null;
  outboxFailed: number | null;
  outboxOldestPendingAgeMs: number;
  workerDiagnostics: unknown;
  lastDispatch: unknown;
  divergentOutboxCompleted: number | null;
  classification: "scheduling" | "processor" | "dispatch" | "client_sync" | "healthy" | "unknown";
  goNoGo: "GO" | "NO-GO" | "INVESTIGATE";
};

function classifyHealth(report: Omit<HealthReport, "classification" | "goNoGo">): Pick<HealthReport, "classification" | "goNoGo"> {
  if ((report.outboxFailed ?? 0) > 0) {
    return { classification: "processor", goNoGo: "NO-GO" };
  }
  if ((report.outboxPending ?? 0) > 0 && report.outboxOldestPendingAgeMs > 5 * 60_000) {
    const skipped = Array.isArray(report.workerDiagnostics)
      && report.workerDiagnostics.some(
        (d) =>
          typeof d === "object"
          && d
          && (d as { worker_name?: string; status?: string }).worker_name === "notification_outbox"
          && (d as { status?: string }).status === "skipped",
      );
    if (skipped) return { classification: "scheduling", goNoGo: "NO-GO" };
    return { classification: "processor", goNoGo: "INVESTIGATE" };
  }
  if ((report.divergentOutboxCompleted ?? 0) > 0) {
    return { classification: "dispatch", goNoGo: "NO-GO" };
  }
  if ((report.outboxPending ?? 0) === 0 && (report.outboxFailed ?? 0) === 0) {
    return { classification: "healthy", goNoGo: "GO" };
  }
  return { classification: "unknown", goNoGo: "INVESTIGATE" };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runHealthCheck(client: ReturnType<typeof createClient<any>>): Promise<HealthReport> {
  const now = Date.now();

  const [
    { count: outboxPending },
    { count: outboxFailed },
    { data: workerDiag },
    { data: oldestPending },
    { data: lastDispatch },
    { count: divergent },
  ] = await Promise.all([
    client
      .from("notification_outbox")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "processing"]),
    client
      .from("notification_outbox")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed"),
    client
      .from("notification_worker_diagnostics")
      .select("worker_name, status, detail, created_at")
      .eq("worker_name", "notification_outbox")
      .order("created_at", { ascending: false })
      .limit(10),
    client
      .from("notification_outbox")
      .select("created_at")
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: true })
      .limit(1),
    client
      .from("notification_dispatch_log")
      .select("status, created_at, dispatch_notification_event_id, created_count")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1),
    client
      .from("notification_outbox")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .is("processed_at", null),
  ]);

  const outboxOldestPendingAgeMs = oldestPending?.[0]
    ? now - new Date(String((oldestPending[0] as { created_at: string }).created_at)).getTime()
    : 0;

  const base = {
    outboxPending,
    outboxFailed,
    outboxOldestPendingAgeMs,
    workerDiagnostics: workerDiag,
    lastDispatch: lastDispatch?.[0] ?? null,
    divergentOutboxCompleted: divergent,
    cronSecretConfigured: Boolean(process.env.CRON_SECRET?.trim()?.length),
  };

  const verdict = classifyHealth({
    outboxPending,
    outboxFailed,
    outboxOldestPendingAgeMs,
    workerDiagnostics: workerDiag,
    lastDispatch: lastDispatch?.[0] ?? null,
    divergentOutboxCompleted: divergent,
  });

  return { ...base, ...verdict };
}

async function main(): Promise<void> {
  const client = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (healthOnly || !entityId) {
    const report = await runHealthCheck(client);
    console.log(JSON.stringify(report, null, 2));
    if (!entityId || healthOnly) return;
  }

  const checkpoints: Checkpoint[] = [];

  const { data: outboxRows } = await client
    .from("notification_outbox")
    .select("id, status, notification_event_id, trace_id, error_message, created_at, processed_at")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(5);

  const outbox = outboxRows?.[0];
  checkpoints.push({
    name: "notification_outbox",
    ok: Boolean(outbox),
    detail: outbox ? `status=${outbox.status} event=${outbox.notification_event_id}` : "no row",
  });

  const traceId = outbox?.trace_id as string | undefined;
  let pipelineTrace: unknown[] = [];
  if (traceId) {
    const { data } = await client
      .from("notification_pipeline_trace")
      .select("stage, recipient_count, notifications_created, error, created_at")
      .eq("trace_id", traceId)
      .order("created_at", { ascending: true });
    pipelineTrace = data ?? [];
    checkpoints.push({
      name: "pipeline_trace",
      ok: (data?.length ?? 0) > 0,
      detail: `stages=${(data ?? []).map((r) => r.stage).join(" → ") || "none"}`,
    });
  }

  const { data: notifications } = await client
    .from("notifications")
    .select("id, type, scope_value, created_at, dedup_key")
    .or(`entity_id.eq.${entityId},dedup_key.ilike.%${entityId}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  checkpoints.push({
    name: "notifications",
    ok: (notifications?.length ?? 0) > 0,
    detail: `count=${notifications?.length ?? 0}`,
  });

  const { data: dispatchLog } = await client
    .from("notification_dispatch_log")
    .select("dispatch_notification_event_id, status, recipient_count, created_count, error_message")
    .order("created_at", { ascending: false })
    .limit(5);

  checkpoints.push({
    name: "notification_dispatch_log",
    ok: (dispatchLog ?? []).some((r) => (r.created_count ?? 0) > 0),
    detail: `recent=${JSON.stringify(dispatchLog ?? [])}`,
  });

  const firstFail = checkpoints.find((c) => !c.ok);
  const lastOk = [...checkpoints].reverse().find((c) => c.ok);

  console.log(
    JSON.stringify(
      {
        entityId,
        traceId: traceId ?? null,
        checkpoints,
        diagnosis: {
          lastCheckpointOk: lastOk?.name ?? null,
          firstCheckpointFail: firstFail?.name ?? null,
        },
        pipelineTrace,
        notifications,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
