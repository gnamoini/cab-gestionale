import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { assertSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { fanoutEntityNotification } from "@/lib/notifications/dispatch/entity-fanout.server";
import {
  buildLegacyNotificationFromOutbox,
  type OutboxRow,
} from "@/lib/notifications/outbox/build-legacy-from-outbox.server";
import { writePipelineTrace } from "@/lib/notifications/observability/pipeline-trace.server";
import { logNotificationTrace } from "@/lib/notifications/observability/notification-trace";

export type NotificationOutboxProcessorResult = {
  ok: boolean;
  processed: number;
  completed: number;
  failed: number;
  skipped: number;
  error?: string;
};

type ClaimedOutboxRow = OutboxRow & {
  attempt_count: number;
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

export async function runNotificationOutboxProcessor(input?: {
  limit?: number;
}): Promise<NotificationOutboxProcessorResult> {
  const client = createAdminClient();
  const limit = input?.limit ?? 20;

  const { data: claimed, error: claimError } = await client.rpc("cab_claim_notification_outbox_batch", {
    p_limit: limit,
  });

  if (claimError) {
    return {
      ok: false,
      processed: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
      error: claimError.message,
    };
  }

  const rows = (claimed ?? []) as ClaimedOutboxRow[];
  if (!rows.length) {
    return { ok: true, processed: 0, completed: 0, failed: 0, skipped: 0 };
  }

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
      if (!legacy) {
        skipped += 1;
        await completeOutbox(client, row.id, "completed");
        continue;
      }

      const result = await fanoutEntityNotification(
        {
          notificationEventId: row.notification_event_id,
          entityType: row.entity_type,
          entityId: row.entity_id,
          actorId: row.actor_id,
          companyId: row.company_id,
          legacyNotification: legacy,
          traceId,
        },
        client,
      );

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

  return {
    ok: true,
    processed: rows.length,
    completed,
    failed,
    skipped,
  };
}
