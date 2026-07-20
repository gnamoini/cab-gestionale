"use client";

import { inboxNotificationHref } from "@/lib/notifications/inbox-notification-message";
import type { InboxNotificationRow } from "@/lib/notifications/notification-types";
import { showLocalSystemNotification } from "@/lib/pwa/show-local-system-notification";

/** Notifica di sistema locale per una voce inbox (stesso percorso del test). */
export async function dispatchInboxSystemNotification(row: InboxNotificationRow): Promise<boolean> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;

  const title = row.title?.trim() || "Notifica";
  const body = row.body?.trim() || "Nuova notifica";
  const href = inboxNotificationHref(row) ?? "/dashboard";

  return showLocalSystemNotification({
    title,
    body,
    href,
    tag: row.id,
    notificationId: row.id,
  });
}
