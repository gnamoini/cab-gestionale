"use client";

import {
  adminDashboardNotificationDesktopPayload,
} from "@/lib/notifications/admin-dashboard-desktop";
import {
  buildAdminDashboardTestNotification,
  type AdminDashboardTestNotification,
} from "@/lib/notifications/admin-dashboard-notifications";
import { showLocalSystemNotification } from "@/lib/pwa/show-local-system-notification";
import { shouldPreferPwaPushOverDesktopPrompt } from "@/lib/pwa/push-permission-flow";

export async function dispatchAdminDashboardTestSystemNotification(input?: {
  notification?: AdminDashboardTestNotification;
  pushActive?: boolean;
}): Promise<boolean> {
  const preferPush = shouldPreferPwaPushOverDesktopPrompt();
  const pushActive = input?.pushActive === true;
  if (!preferPush && !pushActive) return false;

  const notification = input?.notification ?? buildAdminDashboardTestNotification();
  const payload = adminDashboardNotificationDesktopPayload(notification);
  return showLocalSystemNotification(payload);
}
