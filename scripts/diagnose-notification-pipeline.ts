/**
 * Fase 0 — Diagnostica pipeline notifiche per una lavorazione (o evento generico).
 *
 * Uso:
 *   npx tsx scripts/diagnose-notification-pipeline.ts <entity_id>
 *   npx tsx scripts/diagnose-notification-pipeline.ts --health
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

async function main(): Promise<void> {
  const client = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (healthOnly || !entityId) {
    const [{ count: outboxPending }, { count: outboxFailed }, { data: workerDiag }] = await Promise.all([
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
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    console.log(JSON.stringify({ outboxPending, outboxFailed, workerDiag }, null, 2));
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
