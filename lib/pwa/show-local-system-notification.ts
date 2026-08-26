"use client";

import { CAB_APP_PRODUCT_NAME } from "@/lib/branding/cab-product-identity";

const DEFAULT_ICON = "/icons/icon-192x192.png";

export type LocalSystemNotificationOptions = {
  title: string;
  body: string;
  href: string;
  tag: string;
  icon?: string;
  notificationId?: string;
};

/** ponytail: preview locale via SW — non sostituisce web push server. */
export async function showLocalSystemNotification(
  options: LocalSystemNotificationOptions,
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(options.title.trim() || CAB_APP_PRODUCT_NAME, {
      body: options.body.trim() || "Nuova notifica",
      icon: options.icon?.trim() || DEFAULT_ICON,
      tag: options.tag.trim() || "cab-notification",
      data: {
        href: options.href,
        notificationId: options.notificationId?.trim(),
      },
    });
    return true;
  } catch {
    return false;
  }
}
