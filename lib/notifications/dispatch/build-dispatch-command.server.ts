import type { PublishNotificationCommand } from "@/lib/notifications/application/publish-notification-command";
import type { AdminDashboardNotification } from "@/lib/notifications/admin-dashboard-notifications";
import { legacyNotificationToCommand } from "@/lib/notifications/adapters/legacy-admin-dashboard";
import { getNotificationRegistryEntry } from "@/lib/notifications/notification-event-catalog";

function recipientIdempotencyKey(baseKey: string, recipientId: string): string {
  return `${baseKey}:recipient:${recipientId}`;
}

function recipientDedupKey(baseDedup: string, recipientId: string): string {
  return `${baseDedup}:u:${recipientId}`;
}

export function buildDispatchCommandFromLegacy(
  notificationEventId: string,
  actorId: string,
  legacyNotification: AdminDashboardNotification,
): (recipientId: string) => PublishNotificationCommand | null {
  const entry = getNotificationRegistryEntry(notificationEventId);
  if (!entry) return () => null;

  const baseCmd = legacyNotificationToCommand(actorId, legacyNotification);
  if (!baseCmd) return () => null;

  return (recipientId: string) => ({
    ...baseCmd,
    scope: { type: "user", value: recipientId },
    dedupKey: recipientDedupKey(baseCmd.dedupKey, recipientId),
    idempotencyKey: recipientIdempotencyKey(baseCmd.idempotencyKey, recipientId),
    actorId,
  });
}
