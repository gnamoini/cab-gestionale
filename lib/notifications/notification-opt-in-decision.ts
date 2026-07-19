import { DESKTOP_PROMPT_DISMISSED_KEY } from "@/lib/lavorazioni/desktop-notification-permission";
import { isPushOptInDismissedInStorage } from "@/lib/pwa/push-optin-state";

export const NOTIFICATION_OPT_IN_DECISION_KEY = "cab-notification-opt-in-decision-v1" as const;

export type NotificationOptInDecision = "pending" | "declined" | "accepted";

export function readNotificationOptInDecision(now = Date.now()): NotificationOptInDecision {
  if (typeof localStorage === "undefined") return "pending";
  try {
    const raw = localStorage.getItem(NOTIFICATION_OPT_IN_DECISION_KEY)?.trim();
    if (raw === "declined" || raw === "accepted") return raw;
    if (localStorage.getItem(DESKTOP_PROMPT_DISMISSED_KEY) === "1") return "declined";
    if (isPushOptInDismissedInStorage(now)) return "declined";
  } catch {
    /* ignore */
  }
  return "pending";
}

export function writeNotificationOptInDecision(decision: Exclude<NotificationOptInDecision, "pending">): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(NOTIFICATION_OPT_IN_DECISION_KEY, decision);
  } catch {
    /* ignore */
  }
}

export function writeNotificationOptInDeclined(): void {
  writeNotificationOptInDecision("declined");
}

export function writeNotificationOptInAccepted(): void {
  writeNotificationOptInDecision("accepted");
}

export function shouldShowNotificationOptInBanner(input: {
  decision: NotificationOptInDecision;
  canPrompt: boolean;
  isActive: boolean;
}): boolean {
  return input.decision === "pending" && input.canPrompt && !input.isActive;
}

export function shouldShowNotificationMenuEnable(input: {
  canPrompt: boolean;
  isActive: boolean;
}): boolean {
  return input.canPrompt && !input.isActive;
}
