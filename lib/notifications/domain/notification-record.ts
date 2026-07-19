import type { NotificationType, NotificationPriority } from "@/lib/notifications/notification-types";
import type { DomainEventType } from "@/lib/notifications/domain/domain-event";
import type { NotificationLifecycleStatus } from "@/lib/notifications/domain/notification-lifecycle";
import type { NotificationSnapshot } from "@/lib/notifications/domain/notification-snapshot";
import type { NotificationAction } from "@/lib/notifications/domain/notification-action";

/** Persisted notification row (SSOT). */
export type NotificationRecord = {
  id: string;
  createdAt: string;
  type: NotificationType;
  scopeType: "user" | "role" | "global";
  scopeValue: string | null;
  scopeModule: string | null;
  priority: NotificationPriority;
  status: NotificationLifecycleStatus;
  statusChangedAt: string;
  title: string;
  body: string;
  href: string | null;
  entityType: string | null;
  entityId: string | null;
  dedupKey: string;
  idempotencyKey: string | null;
  translationKey: string | null;
  translationParams: Record<string, unknown>;
  snapshot: NotificationSnapshot;
  actions: NotificationAction[];
  payloadVersion: string;
  expiresAt: string | null;
  sourceDomainEvent: DomainEventType | null;
  actorId: string | null;
  createdBy: string | null;
};
