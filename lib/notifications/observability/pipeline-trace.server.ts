import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { logNotificationTrace, type NotificationTraceStage } from "@/lib/notifications/observability/notification-trace";

export type PipelineTraceStage =
  | "outbox_enqueued"
  | "worker_invoked"
  | "dispatch"
  | "persist"
  | "realtime_emit"
  | "client_received";

export type WritePipelineTraceInput = {
  traceId: string;
  stage: PipelineTraceStage;
  entityId?: string | null;
  notificationEventId?: string | null;
  recipientCount?: number | null;
  notificationsCreated?: number | null;
  realtimeDelivered?: boolean | null;
  clientReceived?: boolean | null;
  error?: string | null;
  meta?: Record<string, unknown>;
};

const STAGE_TO_LOG: Record<PipelineTraceStage, NotificationTraceStage> = {
  outbox_enqueued: "outbox_enqueued",
  worker_invoked: "outbox_processed",
  dispatch: "dispatch",
  persist: "persist",
  realtime_emit: "delivery_queued",
  client_received: "sw_received",
};

export async function writePipelineTrace(
  client: SupabaseClient,
  input: WritePipelineTraceInput,
): Promise<void> {
  logNotificationTrace({
    traceId: input.traceId,
    stage: STAGE_TO_LOG[input.stage],
    notificationEventId: input.notificationEventId ?? undefined,
    entityId: input.entityId ?? undefined,
    error: input.error ?? undefined,
    ts: new Date().toISOString(),
    meta: {
      pipelineStage: input.stage,
      recipientCount: input.recipientCount,
      notificationsCreated: input.notificationsCreated,
      realtimeDelivered: input.realtimeDelivered,
      clientReceived: input.clientReceived,
      ...input.meta,
    },
  });

  const { error } = await client.rpc("cab_log_notification_pipeline_trace", {
    p_trace_id: input.traceId,
    p_stage: input.stage,
    p_entity_id: input.entityId ?? null,
    p_notification_event_id: input.notificationEventId ?? null,
    p_recipient_count: input.recipientCount ?? null,
    p_notifications_created: input.notificationsCreated ?? null,
    p_realtime_delivered: input.realtimeDelivered ?? null,
    p_client_received: input.clientReceived ?? null,
    p_error: input.error ?? null,
    p_meta: input.meta ?? {},
  });

  if (error) {
    console.error("[notification-pipeline-trace] persist failed:", error.message);
  }
}
