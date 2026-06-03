"use client";

const DESKTOP_ASKED_KEY = "cab-desktop-notifications-asked";

export function wasDesktopNotificationAsked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DESKTOP_ASKED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markDesktopNotificationAsked(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DESKTOP_ASKED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function canUseDesktopNotifications(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestDesktopNotificationPermissionOnce(): Promise<NotificationPermission | null> {
  if (!canUseDesktopNotifications()) return null;
  if (Notification.permission !== "default") return Notification.permission;
  if (wasDesktopNotificationAsked()) return Notification.permission;
  markDesktopNotificationAsked();
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function showDesktopAdminNotification(options: {
  title: string;
  body: string;
  href: string;
  tag: string;
}): void {
  if (!canUseDesktopNotifications() || Notification.permission !== "granted") return;
  try {
    const n = new Notification(options.title, {
      body: options.body,
      tag: options.tag,
      icon: "/favicon.ico",
    });
    n.onclick = () => {
      window.focus();
      window.location.assign(options.href);
      n.close();
    };
  } catch {
    /* ignore */
  }
}

/** @deprecated Usare showDesktopAdminNotification */
export const showDesktopLavorazioneNotification = showDesktopAdminNotification;

/** Richiesta permesso esplicita (click utente su «Notifiche desktop» / test). */
export async function requestDesktopNotificationPermissionInteractive(): Promise<NotificationPermission | null> {
  if (!canUseDesktopNotifications()) return null;
  if (Notification.permission === "granted") return "granted";
  markDesktopNotificationAsked();
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}
