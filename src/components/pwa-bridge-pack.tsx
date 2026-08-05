"use client";

import { NotificationOptInBanner } from "@/src/components/notification-opt-in-banner";
import { PwaNotificationBadgeBridge } from "@/src/components/pwa-notification-badge";
import { PwaNotificationPresenceBridge } from "@/src/components/pwa-notification-presence-bridge";
import { PwaPushOpenBridge } from "@/src/components/pwa-push-open-bridge";
import { PwaPushPermissionBridge } from "@/src/components/pwa-push-permission-bridge";
import { PwaIosInstallPromptBridge } from "@/src/components/pwa-ios-install-prompt-bridge";
import { PwaSyncFinalizationBridge } from "@/src/components/pwa-sync-finalization-bridge";

export default function PwaBridgePack() {
  return (
    <>
      <PwaPushPermissionBridge />
      <PwaNotificationPresenceBridge />
      <NotificationOptInBanner />
      <PwaPushOpenBridge />
      <PwaNotificationBadgeBridge />
      <PwaSyncFinalizationBridge />
      <PwaIosInstallPromptBridge />
    </>
  );
}
