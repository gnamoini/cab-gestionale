"use client";

import { useGestionaleSnapshotRecovery } from "@/src/hooks/use-gestionale-snapshot-recovery";

/** Monta recovery snapshot su focus tab (domini con query attive). */
export function GestionaleSnapshotRecoveryBridge() {
  useGestionaleSnapshotRecovery();
  return null;
}
