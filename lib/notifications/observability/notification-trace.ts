import "server-only";

export type NotificationTraceStage =
  | "outbox_enqueued"
  | "outbox_processed"
  | "dispatch"
  | "persist"
  | "delivery_queued"
  | "worker_claimed"
  | "push_sent"
  | "push_failed"
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
