import type { NotificationType } from "@/lib/notifications/notification-types";

export type InternalNotificationCreated = {
  notificationId: string;
  notificationType: NotificationType;
  createdAt: string;
};

export type InternalNotificationCreatedHandler = (event: InternalNotificationCreated) => void;

const handlers: InternalNotificationCreatedHandler[] = [];

export function onInternalNotificationCreated(handler: InternalNotificationCreatedHandler): () => void {
  handlers.push(handler);
  return () => {
    const i = handlers.indexOf(handler);
    if (i >= 0) handlers.splice(i, 1);
  };
}

export function emitInternalNotificationCreated(event: InternalNotificationCreated): void {
  for (const h of handlers) {
    try {
      h(event);
    } catch (e) {
      console.warn("[notifications] InternalNotificationCreated handler error:", e);
    }
  }
}
