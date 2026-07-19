import type { SupabaseClient } from "@supabase/supabase-js";
import {
  persistNotification,
  enqueueRawDelivery,
} from "@/lib/notifications/infrastructure/notification-repository";
import type {
  PublishNotificationCommand,
  PublishNotificationResult,
} from "@/lib/notifications/application/publish-notification-command";
import { emitInternalNotificationCreated } from "@/lib/notifications/domain/events/internal-notification-created";
import {
  notificationsSsotV2ShadowOnly,
  resolveNotificationsSsotV2Mode,
  notificationsSsotV2Enabled,
} from "@/lib/notifications/notifications-ssot-v2-flag";
import { createNotificationRpc } from "@/lib/notifications/create-notification-rpc";
import type { CreateNotificationInput } from "@/lib/notifications/notification-types";

function validateCommand(cmd: PublishNotificationCommand): string | null {
  if (!cmd.dedupKey || cmd.dedupKey.trim().length < 8) return "invalid_dedup_key";
  if (!cmd.idempotencyKey || cmd.idempotencyKey.trim().length < 8) return "invalid_idempotency_key";
  if (!cmd.title?.trim()) return "invalid_title";
  if (!cmd.body?.trim()) return "invalid_body";
  if (!cmd.translationKey?.trim()) return "invalid_translation_key";
  return null;
}

function toLegacyInput(cmd: PublishNotificationCommand): CreateNotificationInput {
  return {
    type: cmd.notificationType,
    title: cmd.title,
    body: cmd.body,
    href: cmd.deepLink,
    entity_type: cmd.entityType ?? null,
    entity_id: cmd.entityId ?? null,
    dedup_key: cmd.dedupKey,
  };
}

/**
 * SSOT entrypoint — domain only: validate → persist → enqueue RAW → emit.
 * No aggregation, no channel resolution, no providers.
 */
export async function publishNotification(
  client: SupabaseClient,
  cmd: PublishNotificationCommand,
): Promise<PublishNotificationResult> {
  const validationError = validateCommand(cmd);
  if (validationError) {
    console.warn("[notifications] publish validation failed:", validationError);
    return { notificationId: null, created: false, rawEnqueued: false };
  }

  const mode = resolveNotificationsSsotV2Mode();
  if (!notificationsSsotV2Enabled(mode)) {
    const legacy = await createNotificationRpc(client, toLegacyInput(cmd));
    return {
      notificationId: legacy.id,
      created: legacy.inserted,
      rawEnqueued: false,
    };
  }

  const { id, inserted } = await persistNotification(client, cmd);
  if (!id) {
    return { notificationId: null, created: false, rawEnqueued: false };
  }

  let rawEnqueued = false;
  if (!notificationsSsotV2ShadowOnly(mode)) {
    rawEnqueued = await enqueueRawDelivery(client, id);
  }

  if (inserted) {
    emitInternalNotificationCreated({
      notificationId: id,
      notificationType: cmd.notificationType,
      createdAt: new Date().toISOString(),
    });
  }

  return { notificationId: id, created: inserted, rawEnqueued };
}

/** @deprecated Use publishNotification with PublishNotificationCommand */
export const NotificationService = { publish: publishNotification };
