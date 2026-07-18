"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isDirtySyncEnabledForDomain } from "@/lib/feature-flags/gestionale-dirty-sync-flag";
import { useCabSyncListener } from "@/src/hooks/use-cab-sync-listener";
import { invalidateOperationalTruth } from "@/src/lib/runtime/truth-layer/invalidate-runtime-truth";
import { useRealtimeStatus } from "@/src/context/realtime-status-context";
import { QK } from "@/src/lib/react-query/query-keys";

const DASHBOARD_SYNC_DEBOUNCE_MS = 400;

type DashboardSyncInvalidationOpts = {
  /** Invalida truth report (lav/mag widget). */
  magDomain: boolean;
  /** Invalida feed log attività. */
  activityLogs: boolean;
};

/** ponytail: un solo listener `log_modifiche` — upgrade: provider-level singleton module. */
export function useDashboardSyncInvalidation(opts: DashboardSyncInvalidationOpts) {
  const qc = useQueryClient();
  const { gestionale } = useRealtimeStatus();
  const magDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const invalidateMag = useCallback(() => {
    if (!opts.magDomain || gestionale === "connected") return;
    if (isDirtySyncEnabledForDomain("dashboard")) return;
    if (magDebounceRef.current) clearTimeout(magDebounceRef.current);
    magDebounceRef.current = setTimeout(() => {
      magDebounceRef.current = null;
      void invalidateOperationalTruth({ queryClient: qc, domain: "report" });
    }, DASHBOARD_SYNC_DEBOUNCE_MS);
  }, [opts.magDomain, gestionale, qc]);

  const invalidateActivity = useCallback(() => {
    if (!opts.activityLogs) return;
    if (isDirtySyncEnabledForDomain("dashboard")) return;
    if (activityDebounceRef.current) clearTimeout(activityDebounceRef.current);
    activityDebounceRef.current = setTimeout(() => {
      activityDebounceRef.current = null;
      void qc.invalidateQueries({ queryKey: QK.log, refetchType: "active" });
    }, DASHBOARD_SYNC_DEBOUNCE_MS);
  }, [opts.activityLogs, qc]);

  const onLogModifiche = useCallback(() => {
    invalidateMag();
    invalidateActivity();
  }, [invalidateMag, invalidateActivity]);

  useCabSyncListener("log_modifiche", onLogModifiche);
  useCabSyncListener("magazzino_ricambi", () => {
    invalidateMag();
    invalidateActivity();
  });
  useCabSyncListener("movimenti_ricambi", () => {
    invalidateMag();
    invalidateActivity();
  });
  useCabSyncListener(["lavorazioni", "scheda_lavorazione"], invalidateActivity);
  useCabSyncListener(["preventivi", "ddt_documents", "invoices", "invoice_payments"], invalidateActivity);

  useEffect(() => {
    return () => {
      if (magDebounceRef.current) clearTimeout(magDebounceRef.current);
      if (activityDebounceRef.current) clearTimeout(activityDebounceRef.current);
    };
  }, []);
}
