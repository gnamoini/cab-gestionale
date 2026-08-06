"use client";

import { GestionaleNotificationsBridge } from "@/src/components/gestionale-notifications-bridge";
import { GestionaleRealtimeBridge } from "@/src/components/gestionale-realtime-bridge";
import { GestionaleResumeBridge } from "@/src/components/gestionale-resume-bridge";
import { GestionaleSnapshotRecoveryBridge } from "@/src/components/gestionale-snapshot-recovery-bridge";

export default function GestionaleRealtimeBridgePack() {
  return (
    <>
      <GestionaleRealtimeBridge />
      <GestionaleResumeBridge />
      <GestionaleNotificationsBridge />
      <GestionaleSnapshotRecoveryBridge />
    </>
  );
}
