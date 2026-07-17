"use client";

import { NotificationOptInBanner } from "@/src/components/notification-opt-in-banner";
import { PwaNotificationBadgeBridge } from "@/src/components/pwa-notification-badge";
import { PwaPushOpenBridge } from "@/src/components/pwa-push-open-bridge";
import { PwaPushPermissionBridge } from "@/src/components/pwa-push-permission-bridge";
import { PwaSyncFinalizationBridge } from "@/src/components/pwa-sync-finalization-bridge";

export default function PwaBridgePack() {
  return (
    <>
      <PwaPushPermissionBridge />
      <NotificationOptInBanner />
      <PwaPushOpenBridge />
      <PwaNotificationBadgeBridge />
      <PwaSyncFinalizationBridge />
    </>
  );
}
