"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  GESTIONALE_DISPATCH_DEDUP_MS,
  getLastGestionaleDispatchAt,
} from "@/lib/sync/gestionale-sync-dispatch";
import { refetchActiveOperationalSnapshot } from "@/lib/sync/gestionale-snapshot-recovery";
import { useRealtimeStatus } from "@/src/context/realtime-status-context";

const FOCUS_DEBOUNCE_MS = 500;

/** Snapshot mirato su focus tab quando Realtime è connesso. */
export function useGestionaleSnapshotRecovery(enabled = true): void {
  const qc = useQueryClient();
  const { gestionale } = useRealtimeStatus();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    const onVisibility = () => {
      if (document.visibilityState !== "visible" || gestionale !== "connected") return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        if (Date.now() - getLastGestionaleDispatchAt() < GESTIONALE_DISPATCH_DEDUP_MS) return;
        refetchActiveOperationalSnapshot(qc, { onlyActive: true });
      }, FOCUS_DEBOUNCE_MS);
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [enabled, gestionale, qc]);
}
