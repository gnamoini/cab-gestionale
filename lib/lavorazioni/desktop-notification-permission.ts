export type DesktopNotificationPermissionState =
  | "unsupported"
  | "default"
  | "granted"
  | "denied";

export const DESKTOP_PROMPT_DISMISSED_KEY = "cab-desktop-notifications-prompt-dismissed";

/** Legacy: auto-ask senza gesto utente (non blocca più il banner proattivo). */
export const DESKTOP_ASKED_LEGACY_KEY = "cab-desktop-notifications-asked";

export function resolveDesktopNotificationPermissionState(
  hasNotificationApi: boolean,
  permission: NotificationPermission | undefined,
): DesktopNotificationPermissionState {
  if (!hasNotificationApi) return "unsupported";
  if (permission === "granted") return "granted";
  if (permission === "denied") return "denied";
  return "default";
}

export function formatDesktopNotificationPermissionStatusLabel(
  state: DesktopNotificationPermissionState,
): string {
  switch (state) {
    case "granted":
      return "attive";
    case "denied":
      return "non autorizzate";
    case "default":
      return "non attive";
    case "unsupported":
      return "non supportate";
  }
}

import { readNotificationOptInDecision } from "@/lib/notifications/notification-opt-in-decision";

export function shouldShowDesktopNotificationPermissionBanner(
  state: DesktopNotificationPermissionState,
  promptDismissed: boolean,
): boolean {
  return (
    state === "default" &&
    !promptDismissed &&
    readNotificationOptInDecision() === "pending"
  );
}
