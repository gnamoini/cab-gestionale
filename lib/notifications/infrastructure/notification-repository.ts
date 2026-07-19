import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublishNotificationCommand } from "@/lib/notifications/application/publish-notification-command";
import type { NotificationRecord } from "@/lib/notifications/domain/notification-record";
import type { NotificationType } from "@/lib/notifications/notification-types";
import { toLegacyPriority } from "@/lib/notifications/domain/notification-priority";
import { emptySnapshot } from "@/lib/notifications/domain/notification-snapshot";

export type PersistNotificationResult = {
  id: string | null;
  inserted: boolean;
};

type PublishRpcRow = {
  id?: string | null;
  inserted?: boolean;
};

function mapRowToRecord(row: Record<string, unknown>): NotificationRecord {
  return {
    id: String(row.id),
    createdAt: String(row.created_at),
    type: row.type as NotificationType,
    scopeType: row.scope_type as NotificationRecord["scopeType"],
    scopeValue: (row.scope_value as string | null) ?? null,
    scopeModule: (row.scope_module as string | null) ?? null,
    priority: row.priority as NotificationRecord["priority"],
    status: (row.status as NotificationRecord["status"]) ?? "CREATED",
    statusChangedAt: String(row.status_changed_at ?? row.created_at),
    title: String(row.title),
    body: String(row.body),
    href: (row.href as string | null) ?? null,
    entityType: (row.entity_type as string | null) ?? null,
    entityId: row.entity_id ? String(row.entity_id) : null,
    dedupKey: String(row.dedup_key),
    idempotencyKey: (row.idempotency_key as string | null) ?? null,
    translationKey: (row.translation_key as string | null) ?? null,
    translationParams: (row.translation_params as Record<string, unknown>) ?? {},
    snapshot: (row.snapshot as NotificationRecord["snapshot"]) ?? emptySnapshot(),
    actions: (row.actions as NotificationRecord["actions"]) ?? [],
    payloadVersion: String(row.payload_version ?? "v1"),
    expiresAt: (row.expires_at as string | null) ?? null,
    sourceDomainEvent: (row.source_domain_event as NotificationRecord["sourceDomainEvent"]) ?? null,
    actorId: row.actor_id ? String(row.actor_id) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
  };
}

export async function persistNotification(
  client: SupabaseClient,
  cmd: PublishNotificationCommand,
): Promise<PersistNotificationResult> {
  const priority = cmd.priority ? toLegacyPriority(cmd.priority) : undefined;

  const { data, error } = await client.rpc("cab_publish_notification", {
    p_type: cmd.notificationType,
    p_title: cmd.title,
    p_body: cmd.body,
    p_href: cmd.deepLink,
    p_entity_type: cmd.entityType ?? null,
    p_entity_id: cmd.entityId ?? null,
    p_dedup_key: cmd.dedupKey,
    p_idempotency_key: cmd.idempotencyKey,
    p_translation_key: cmd.translationKey,
    p_translation_params: cmd.translationParams ?? {},
    p_snapshot: cmd.snapshot ?? emptySnapshot(),
    p_actions: cmd.actions ?? [],
    p_payload_version: cmd.payloadVersion ?? "v1",
    p_expires_at: cmd.expiresAt ?? null,
    p_source_domain_event: cmd.sourceDomainEvent ?? null,
    p_actor_id: cmd.actorId ?? null,
    p_priority: priority ?? null,
  });

  if (error) {
    console.warn("[notifications] cab_publish_notification failed:", error.message);
    return { id: null, inserted: false };
  }

  const row = (Array.isArray(data) ? data[0] : data) as PublishRpcRow | null;
  if (!row?.id) return { id: null, inserted: false };
  return { id: row.id, inserted: Boolean(row.inserted) };
}

export async function enqueueRawDelivery(
  client: SupabaseClient,
  notificationId: string,
): Promise<boolean> {
  const { data, error } = await client.rpc("cab_enqueue_raw_delivery", {
    p_notification_id: notificationId,
  });
  if (error) {
    console.warn("[notifications] cab_enqueue_raw_delivery failed:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function loadNotificationRecord(
  client: SupabaseClient,
  notificationId: string,
): Promise<NotificationRecord | null> {
  const { data, error } = await client
    .from("notifications")
    .select("*")
    .eq("id", notificationId)
    .maybeSingle();

  if (error || !data) return null;
  return mapRowToRecord(data as Record<string, unknown>);
}

export async function loadNotificationRecords(
  client: SupabaseClient,
  notificationIds: string[],
): Promise<NotificationRecord[]> {
  if (!notificationIds.length) return [];
  const { data, error } = await client.from("notifications").select("*").in("id", notificationIds);
  if (error || !data) return [];
  return data.map((row) => mapRowToRecord(row as Record<string, unknown>));
}
