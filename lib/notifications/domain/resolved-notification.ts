import type { NotificationType, NotificationPriority } from "@/lib/notifications/notification-types";
import type { NotificationSnapshot } from "@/lib/notifications/domain/notification-snapshot";
import type { NotificationAction } from "@/lib/notifications/domain/notification-action";

/** Immutable resolved payload for all delivery providers. */
export type ResolvedNotification = {
  id: string;
  notificationType: NotificationType;
  payloadVersion: string;
  title: string;
  body: string;
  icon?: string;
  color?: string;
  deepLink: string;
  actions: NotificationAction[];
  snapshot: NotificationSnapshot;
  priority: NotificationPriority;
};
