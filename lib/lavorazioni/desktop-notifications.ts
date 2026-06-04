"use client";

import {
  DESKTOP_PROMPT_DISMISSED_KEY,
  formatDesktopNotificationPermissionStatusLabel,
  resolveDesktopNotificationPermissionState,
  shouldShowDesktopNotificationPermissionBanner,
  type DesktopNotificationPermissionState,
} from "@/lib/lavorazioni/desktop-notification-permission";

export type { DesktopNotificationPermissionState };
export {
  DESKTOP_PROMPT_DISMISSED_KEY,
  formatDesktopNotificationPermissionStatusLabel,
  shouldShowDesktopNotificationPermissionBanner,
};

export function canUseDesktopNotifications(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getDesktopNotificationPermissionState(): DesktopNotificationPermissionState {
  if (!canUseDesktopNotifications()) return "unsupported";
  return resolveDesktopNotificationPermissionState(true, Notification.permission);
}

export function wasDesktopNotificationPromptDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DESKTOP_PROMPT_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissDesktopNotificationPrompt(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DESKTOP_PROMPT_DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** @deprecated Usare wasDesktopNotificationPromptDismissed */
export function wasDesktopNotificationAsked(): boolean {
  return wasDesktopNotificationPromptDismissed();
}

/** @deprecated Usare dismissDesktopNotificationPrompt */
export function markDesktopNotificationAsked(): void {
  dismissDesktopNotificationPrompt();
}

/**
 * Solo lettura permesso (nessuna richiesta al browser).
 * @deprecated Non invocare requestPermission in background; usare requestDesktopNotificationPermissionInteractive.
 */
export async function requestDesktopNotificationPermissionOnce(): Promise<NotificationPermission | null> {
  if (!canUseDesktopNotifications()) return null;
  return Notification.permission;
}

/** Richiesta permesso con gesto utente (banner / campanella). */
export async function requestDesktopNotificationPermissionInteractive(): Promise<NotificationPermission | null> {
  if (!canUseDesktopNotifications()) return null;
  if (Notification.permission === "granted") return "granted";
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
