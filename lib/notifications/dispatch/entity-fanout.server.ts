import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDispatchCommandFromLegacy } from "@/lib/notifications/dispatch/build-dispatch-command.server";
import { entityDispatchIdempotencyKey } from "@/lib/notifications/dispatch/entity-idempotency";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch/notification-dispatch-service.server";
import { resolveSingleCompanyId } from "@/lib/notifications/dispatch/resolve-company-id.server";
import type { AdminDashboardNotification } from "@/lib/notifications/admin-dashboard-notifications";
import {
  logNotificationTrace,
  type NotificationTraceStage,
} from "@/lib/notifications/observability/notification-trace";

export type FanoutEntityNotificationInput = {
  notificationEventId: string;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  companyId?: string | null;
  legacyNotification: AdminDashboardNotification;
  traceId: string;
  dispatchVersion?: string;
};

export type FanoutEntityNotificationResult = {
  created: number;
  skipped: number;
  recipientCount: number;
  duplicate: boolean;
};

function traceStage(
  traceId: string,
  stage: NotificationTraceStage,
  input: FanoutEntityNotificationInput,
  extra?: { error?: string; durationMs?: number },
): void {
  logNotificationTrace({
    traceId,
    stage,
    notificationEventId: input.notificationEventId,
    entityType: input.entityType,
    entityId: input.entityId,
    error: extra?.error,
    durationMs: extra?.durationMs,
    ts: new Date().toISOString(),
  });
}

export async function fanoutEntityNotification(
  input: FanoutEntityNotificationInput,
  client: SupabaseClient,
): Promise<FanoutEntityNotificationResult> {
  const t0 = Date.now();
  const companyId = input.companyId ?? (await resolveSingleCompanyId(client));
  if (!companyId) {
    traceStage(input.traceId, "dispatch", input, { error: "company_not_found" });
    return { created: 0, skipped: 0, recipientCount: 0, duplicate: false };
  }

  const actorId = input.actorId ?? "server";
  const dispatchIdempotencyKey = entityDispatchIdempotencyKey(
    input.notificationEventId,
    input.entityType,
    input.entityId,
    input.dispatchVersion,
  );

  const buildCommand = buildDispatchCommandFromLegacy(
    input.notificationEventId,
    actorId,
    input.legacyNotification,
  );

  try {
    const result = await dispatchNotificationEvent(
      {
        notificationEventId: input.notificationEventId,
        companyId,
        actorId: input.actorId ?? undefined,
        dispatchIdempotencyKey,
        buildCommand: (recipientId) => buildCommand(recipientId)!,
      },
      client,
    );
    traceStage(input.traceId, "dispatch", input, { durationMs: Date.now() - t0 });
    if (result.created > 0) {
      traceStage(input.traceId, "persist", input, { durationMs: Date.now() - t0 });
    }
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : "dispatch_failed";
    traceStage(input.traceId, "dispatch", input, { error: message, durationMs: Date.now() - t0 });
    throw e;
  }
}
