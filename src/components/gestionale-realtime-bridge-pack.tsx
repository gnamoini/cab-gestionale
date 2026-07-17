"use client";

import { GestionaleNotificationsBridge } from "@/src/components/gestionale-notifications-bridge";
import { GestionaleRealtimeBridge } from "@/src/components/gestionale-realtime-bridge";
import { GestionaleSnapshotRecoveryBridge } from "@/src/components/gestionale-snapshot-recovery-bridge";

export default function GestionaleRealtimeBridgePack() {
  return (
    <>
      <GestionaleRealtimeBridge />
      <GestionaleNotificationsBridge />
      <GestionaleSnapshotRecoveryBridge />
    </>
  );
}
