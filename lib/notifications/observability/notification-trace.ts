import "server-only";

export type NotificationTraceStage =
  | "outbox_enqueued"
  | "outbox_claimed"
  | "outbox_drained"
  | "outbox_processed"
  | "worker_invoke_skipped"
  | "worker_invoked"
  | "reconciliation_fetch"
  | "dispatch"
  | "persist"
  | "delivery_queued"
  | "worker_claimed"
  | "push_sent"
  | "push_failed"
  | "realtime_emit"
  | "client_received"
  | "sw_received"
  | "sw_displayed"
  | "click";

export type NotificationTraceEvent = {
  traceId: string;
  stage: NotificationTraceStage;
  notificationId?: string;
  notificationEventId?: string;
  entityType?: string;
  entityId?: string;
  error?: string;
  ts: string;
  durationMs?: number;
  meta?: Record<string, unknown>;
};

export function createNotificationTraceId(): string {
  return crypto.randomUUID();
}

export function logNotificationTrace(event: NotificationTraceEvent): void {
  const payload = {
    component: "notification-pipeline",
    ...event,
  };
  if (event.error) {
    console.error("[notification-trace]", JSON.stringify(payload));
    return;
  }
  console.info("[notification-trace]", JSON.stringify(payload));
}
