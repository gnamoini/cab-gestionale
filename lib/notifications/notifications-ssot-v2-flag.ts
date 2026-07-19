/**
 * Feature flags for notification SSOT v4 pipeline.
 * Env: NEXT_PUBLIC_NOTIFICATIONS_SSOT_V2=off|shadow|on
 */
export type NotificationsSsotV2Mode = "off" | "shadow" | "on";

export function resolveNotificationsSsotV2Mode(): NotificationsSsotV2Mode {
  const env = process.env.NEXT_PUBLIC_NOTIFICATIONS_SSOT_V2?.trim();
  if (env === "off" || env === "shadow" || env === "on") return env;
  return "on";
}

export function notificationsSsotV2Enabled(mode: NotificationsSsotV2Mode = resolveNotificationsSsotV2Mode()): boolean {
  return mode === "on" || mode === "shadow";
}

export function notificationsSsotV2ShadowOnly(mode: NotificationsSsotV2Mode = resolveNotificationsSsotV2Mode()): boolean {
  return mode === "shadow";
}
