import type { PushPermissionState } from "@/lib/pwa/push-types";

export function resolvePushPermissionState(input: {
  pushEnabled: boolean;
  hasPushManager: boolean;
  hasServiceWorker: boolean;
  notificationPermission: NotificationPermission | undefined;
  hasActiveSubscription: boolean;
  subscriptionRevoked: boolean;
}): PushPermissionState {
  if (!input.pushEnabled || !input.hasServiceWorker || !input.hasPushManager) {
    return "unsupported";
  }
  if (input.subscriptionRevoked) return "revoked";
  if (input.notificationPermission === "denied") return "denied";
  if (input.hasActiveSubscription && input.notificationPermission === "granted") {
    return "granted";
  }
  if (input.notificationPermission === "granted" && !input.hasActiveSubscription) {
    return "prompted";
  }
  if (input.notificationPermission === "default") return "default";
  return "unsupported";
}

export function shouldShowPushOptInBanner(state: PushPermissionState): boolean {
  return state === "default" || state === "prompted";
}
