import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { assertSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch/notification-dispatch-service.server";
import { fanoutEntityNotification } from "@/lib/notifications/dispatch/entity-fanout.server";
import { entityDispatchIdempotencyKey } from "@/lib/notifications/dispatch/entity-idempotency";
import { resolveSingleCompanyId } from "@/lib/notifications/dispatch/resolve-company-id.server";
import { buildCatalogOutboxCommand } from "@/lib/notifications/outbox/build-catalog-outbox-command.server";
import {
  buildLegacyNotificationFromOutbox,
  magazzinoEpisodeIdFromOutboxRow,
  type OutboxRow,
} from "@/lib/notifications/outbox/build-legacy-from-outbox.server";
import {
  OUTBOX_BATCH_LIMIT,
  OUTBOX_MAX_EVENTS_PER_INVOCATION,
  OUTBOX_PROCESSOR_TIME_BUDGET_MS,
} from "@/lib/notifications/outbox/outbox-processor-config";
import { writePipelineTrace } from "@/lib/notifications/observability/pipeline-trace.server";
import { logNotificationTrace } from "@/lib/notifications/observability/notification-trace";

export type NotificationOutboxProcessorResult = {
  ok: boolean;
  processed: number;
  completed: number;
  failed: number;
  skipped: number;
  batches: number;
  drained: boolean;
  error?: string;
};

type ClaimedOutboxRow = OutboxRow & {
  attempt_count: number;
};

type BatchStats = {
  completed: number;
  failed: number;
  skipped: number;
};

const MAX_ATTEMPTS = 5;

function createAdminClient(): SupabaseClient {
  const serviceKey = assertSupabaseServiceRoleKey();
  const { url } = assertSupabasePublicEnv();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function completeOutbox(
  client: SupabaseClient,
  outboxId: string,
  status: "completed" | "failed",
  error?: string,
): Promise<void> {
  await client.rpc("cab_complete_notification_outbox", {
    p_outbox_id: outboxId,
    p_status: status,
    p_error: error ?? null,
  });
}

async function processOutboxBatch(
  client: SupabaseClient,
  rows: ClaimedOutboxRow[],
): Promise<BatchStats> {
  let completed = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows) {
    const traceId = row.trace_id;
    await writePipelineTrace(client, {
      traceId,
      stage: "worker_invoked",
      entityId: row.entity_id,
      notificationEventId: row.notification_event_id,
    });
    logNotificationTrace({
      traceId,
      stage: "outbox_processed",
      notificationEventId: row.notification_event_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      ts: new Date().toISOString(),
    });

    try {
      const legacy = await buildLegacyNotificationFromOutbox(client, row);
      let result: { created: number; duplicate: boolean };

      if (legacy) {
        const dispatchVersion =
          row.notification_event_id === "magazzino.below_minimum"
            ? magazzinoEpisodeIdFromOutboxRow(row) ?? undefined
            : undefined;
        result = await fanoutEntityNotification(
          {
            notificationEventId: row.notification_event_id,
            entityType: row.entity_type,
            entityId: row.entity_id,
            actorId: row.actor_id,
            companyId: row.company_id,
            legacyNotification: legacy,
            traceId,
            dispatchVersion,
          },
          client,
        );
      } else {
        const buildCommand = buildCatalogOutboxCommand(row);
        if (!buildCommand) {
          skipped += 1;
          await completeOutbox(client, row.id, "completed");
          continue;
        }

        const companyId = row.company_id ?? (await resolveSingleCompanyId(client));
        if (!companyId) {
          skipped += 1;
          await completeOutbox(client, row.id, "completed");
          continue;
        }

        result = await dispatchNotificationEvent(
          {
            notificationEventId: row.notification_event_id,
            companyId,
            actorId: row.actor_id ?? undefined,
            dispatchIdempotencyKey: entityDispatchIdempotencyKey(
              row.notification_event_id,
              row.entity_type,
              row.entity_id,
            ),
            buildCommand,
            traceId,
            entityId: row.entity_id,
          },
          client,
        );
      }

      if (result.created === 0 && !result.duplicate) {
        skipped += 1;
      }

      await completeOutbox(client, row.id, "completed");
      completed += 1;
    } catch (e) {
      const message = e instanceof Error ? e.message : "outbox_process_failed";
      const attempts = row.attempt_count ?? 1;
      if (attempts >= MAX_ATTEMPTS) {
        await completeOutbox(client, row.id, "failed", message);
        failed += 1;
      } else {
        await client.rpc("cab_release_notification_outbox", {
          p_outbox_id: row.id,
          p_error: message,
        });
        failed += 1;
      }
      logNotificationTrace({
        traceId,
        stage: "outbox_processed",
        notificationEventId: row.notification_event_id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        error: message,
        ts: new Date().toISOString(),
      });
    }
  }

  return { completed, failed, skipped };
}

export async function runNotificationOutboxProcessor(input?: {
  limit?: number;
  timeBudgetMs?: number;
  maxEvents?: number;
}): Promise<NotificationOutboxProcessorResult> {
  const client = createAdminClient();
  const batchLimit = input?.limit ?? OUTBOX_BATCH_LIMIT;
  const timeBudgetMs = input?.timeBudgetMs ?? OUTBOX_PROCESSOR_TIME_BUDGET_MS;
  const maxEvents = input?.maxEvents ?? OUTBOX_MAX_EVENTS_PER_INVOCATION;
  const startedAt = Date.now();

  let totalProcessed = 0;
  let totalCompleted = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let batches = 0;
  let drained = false;

  while (true) {
    if (Date.now() - startedAt >= timeBudgetMs) break;
    if (totalProcessed >= maxEvents) break;

    const remaining = maxEvents - totalProcessed;
    const claimLimit = Math.min(batchLimit, remaining);

    const { data: claimed, error: claimError } = await client.rpc(
      "cab_claim_notification_outbox_batch",
      { p_limit: claimLimit },
    );

    if (claimError) {
      return {
        ok: false,
        processed: totalProcessed,
        completed: totalCompleted,
        failed: totalFailed,
        skipped: totalSkipped,
        batches,
        drained: false,
        error: claimError.message,
      };
    }

    const rows = (claimed ?? []) as ClaimedOutboxRow[];
    if (!rows.length) {
      drained = true;
      break;
    }

    batches += 1;
    logNotificationTrace({
      traceId: rows[0]?.trace_id ?? "outbox-batch",
      stage: "outbox_claimed",
      notificationEventId: rows[0]?.notification_event_id,
      ts: new Date().toISOString(),
      meta: { batchSize: rows.length, batchIndex: batches },
    });

    const batchStats = await processOutboxBatch(client, rows);
    totalProcessed += rows.length;
    totalCompleted += batchStats.completed;
    totalFailed += batchStats.failed;
    totalSkipped += batchStats.skipped;
  }

  if (drained) {
    logNotificationTrace({
      traceId: "outbox-drain",
      stage: "outbox_drained",
      ts: new Date().toISOString(),
      meta: { processed: totalProcessed, batches },
    });
  }

  return {
    ok: true,
    processed: totalProcessed,
    completed: totalCompleted,
    failed: totalFailed,
    skipped: totalSkipped,
    batches,
    drained,
  };
}
