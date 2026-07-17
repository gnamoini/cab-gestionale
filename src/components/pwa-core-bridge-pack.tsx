"use client";

import { PwaConnectivityGate } from "@/src/components/pwa-connectivity-gate";
import { PwaDisplayModeBridge } from "@/src/components/pwa-display-mode-bridge";
import { PwaInstallBanner } from "@/src/components/pwa-install-banner";
import { PwaInstallBridge } from "@/src/components/pwa-install-bridge";
import { PwaIosInstallHint } from "@/src/components/pwa-ios-install-hint";
import { PwaNetworkNotice } from "@/src/components/pwa-network-notice";
import { PwaReconnectBridge } from "@/src/components/pwa-reconnect-bridge";
import { PwaServiceWorkerBridge } from "@/src/components/pwa-service-worker-bridge";
import { PwaUpdateBanner } from "@/src/components/pwa-update-banner";

export default function PwaCoreBridgePack() {
  return (
    <>
      <PwaServiceWorkerBridge />
      <PwaDisplayModeBridge />
      <PwaInstallBridge />
      <PwaInstallBanner />
      <PwaIosInstallHint />
      <PwaReconnectBridge />
      <PwaConnectivityGate />
      <PwaUpdateBanner />
      <PwaNetworkNotice />
    </>
  );
}
