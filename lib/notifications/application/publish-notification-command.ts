import type { NotificationType } from "@/lib/notifications/notification-types";
import type { DomainEventType } from "@/lib/notifications/domain/domain-event";
import type { NotificationSnapshot } from "@/lib/notifications/domain/notification-snapshot";
import type { NotificationAction } from "@/lib/notifications/domain/notification-action";
import type { EnterpriseNotificationPriority } from "@/lib/notifications/domain/notification-priority";

export type NotificationScope =
  | { type: "user"; value: string }
  | { type: "role"; value: string }
  | { type: "global" };

export type PublishNotificationCommand = {
  notificationType: NotificationType;
  sourceDomainEvent?: DomainEventType;
  scope?: NotificationScope;
  priority?: EnterpriseNotificationPriority;
  translationKey: string;
  translationParams?: Record<string, unknown>;
  snapshot?: NotificationSnapshot;
  /** Fallback rendered title/body (retrocompat + export). */
  title: string;
  body: string;
  deepLink: string;
  dedupKey: string;
  idempotencyKey: string;
  payloadVersion?: "v1";
  expiresAt?: string;
  actorId?: string;
  entityType?: string | null;
  entityId?: string | null;
  actions?: NotificationAction[];
};

export type PublishNotificationResult = {
  notificationId: string | null;
  created: boolean;
  rawEnqueued: boolean;
};
