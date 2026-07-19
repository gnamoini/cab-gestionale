import { PWA_PUSH_ENABLED } from "@/lib/pwa/pwa-config";
import { isPwaPushDeviceEnabled, readPwaPushDeviceState } from "@/lib/pwa/push-device-state";
import { isPushOptInDismissedInStorage } from "@/lib/pwa/push-optin-state";
import { readNotificationOptInDecision } from "@/lib/notifications/notification-opt-in-decision";
import { isMobileBackgroundPushEligible } from "@/lib/pwa/pwa-mobile";
import { shouldShowPushOptInBanner } from "@/lib/pwa/push-permission-state";
import type { PushPermissionState } from "@/lib/pwa/push-types";

/** Mobile con push in background: priorità subscription Web Push su prompt desktop. */
export function shouldPreferPwaPushOverDesktopPrompt(): boolean {
  if (!PWA_PUSH_ENABLED) return false;
  return isMobileBackgroundPushEligible();
}

export function shouldShowDesktopNotificationPromptWhenPushEligible(): boolean {
  return !shouldPreferPwaPushOverDesktopPrompt();
}

export function shouldShowPwaPushOptInUi(input: {
  permissionState: PushPermissionState;
  now?: number;
}): boolean {
  if (!PWA_PUSH_ENABLED || !isPwaPushDeviceEnabled()) return false;
  const now = input.now ?? Date.now();
  if (readNotificationOptInDecision(now) !== "pending") return false;
  const device = readPwaPushDeviceState();
  if (device.dismissedUntil > now) return false;
  if (isPushOptInDismissedInStorage(now)) return false;
  return shouldShowPushOptInBanner(input.permissionState);
}
