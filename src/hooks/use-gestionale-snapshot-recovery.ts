"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  GESTIONALE_DISPATCH_DEDUP_MS,
  getLastGestionaleDispatchAt,
} from "@/lib/sync/gestionale-sync-dispatch";
import { refetchActiveOperationalSnapshot } from "@/lib/sync/gestionale-snapshot-recovery";
import { registerGestionaleVisibilityHandler } from "@/lib/ui/gestionale-visibility-coordinator";
import { useRealtimeStatus } from "@/src/context/realtime-status-context";

/** Snapshot mirato su focus tab quando Realtime è connesso (coordinator visibility unico). */
export function useGestionaleSnapshotRecovery(enabled = true): void {
  const qc = useQueryClient();
  const { gestionale } = useRealtimeStatus();

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    return registerGestionaleVisibilityHandler(() => {
      if (document.visibilityState !== "visible" || gestionale !== "connected") return;
      if (Date.now() - getLastGestionaleDispatchAt() < GESTIONALE_DISPATCH_DEDUP_MS) return;
      refetchActiveOperationalSnapshot(qc, { onlyActive: true });
    });
  }, [enabled, gestionale, qc]);
}
