"use client";

import { useCallback, useMemo } from "react";
import { useMezzoMaintenanceHistoryQuery } from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import { useMezzoMaintenanceTimelineExtrasQuery } from "@/src/hooks/gestionale/use-maintenance-engine-v2";
import {
  useMezzoBase,
  useMezzoDocumenti,
  useMezzoLavorazioni,
  useMezzoLog,
  useMezzoMovimenti,
  useMezzoPreventivi,
} from "@/src/services/domain/mezzo-domain.queries";
import { mezzoDomainService, type MezzoHubData } from "@/src/services/domain/mezzo-domain.service";
import { HUB_QUERY_LOADING_FAILSAFE_MS, usePendingQueryTimeout } from "@/lib/ui/loading-failsafe";

/**
 * Hub mezzo: attiva in parallelo le query atomiche (`mezzoDomainQueryKeys`) e compone il payload
 * tramite `mezzoDomainService.composeHubData` (nessun IO nel domain service).
 * Le lavorazioni del mezzo condividono la cache `lavorazioniQueries` con `useLavorazioniList`.
 */
export function useMezzoHub(mezzoId: string | undefined) {
  const id = mezzoId?.trim() ?? "";

  const base = useMezzoBase(mezzoId);
  /** Nota: `useMezzoMovimenti` richiama internamente la stessa query; React Query deduplica il network. */
  const lav = useMezzoLavorazioni(mezzoId);
  const pv = useMezzoPreventivi(mezzoId);
  const doc = useMezzoDocumenti(mezzoId);
  const log = useMezzoLog(mezzoId);
  const mov = useMezzoMovimenti(mezzoId);
  const maint = useMezzoMaintenanceHistoryQuery(id, Boolean(id));
  const timelineExtras = useMezzoMaintenanceTimelineExtrasQuery(id, Boolean(id));

  const hubReady =
    id.length > 0 &&
    base.isSuccess &&
    lav.isSuccess &&
    pv.isSuccess &&
    doc.isSuccess &&
    log.isSuccess &&
    mov.isSuccess &&
    maint.isSuccess &&
    timelineExtras.isSuccess;

  const snapshot = useMemo(
    () => ({
      mezzoGestito: base.data,
      lavorazioni: lav.data ?? [],
      preventiviRows: pv.data ?? [],
      documentiRows: doc.data ?? [],
      logRows: log.data ?? [],
      movimentiRows: mov.data ?? [],
      maintenanceHistory: maint.data ?? [],
      maintenanceTimelineExtras: timelineExtras.data ?? [],
    }),
    [base.data, lav.data, pv.data, doc.data, log.data, mov.data, maint.data, timelineExtras.data],
  );

  const data = useMemo((): MezzoHubData | undefined => {
    if (!hubReady) return undefined;
    return mezzoDomainService.composeHubData(snapshot) ?? undefined;
  }, [hubReady, snapshot]);

  const isError =
    id.length > 0 && (base.isError || lav.isError || pv.isError || doc.isError || log.isError || mov.isError || maint.isError || timelineExtras.isError);

  const error = useMemo(() => {
    const e = base.error ?? lav.error ?? pv.error ?? doc.error ?? log.error ?? mov.error ?? maint.error ?? timelineExtras.error;
    return e ?? null;
  }, [base.error, lav.error, pv.error, doc.error, log.error, mov.error, maint.error, timelineExtras.error]);

  const isLoadingRaw = id.length > 0 && !isError && !hubReady;
  const hubTimedOut = usePendingQueryTimeout(isLoadingRaw, HUB_QUERY_LOADING_FAILSAFE_MS);
  const isLoading = isLoadingRaw && !hubTimedOut;
  const isErrorEffective = isError || hubTimedOut;

  const refetch = useCallback(() => {
    return Promise.all([base.refetch(), lav.refetch(), pv.refetch(), doc.refetch(), log.refetch(), mov.refetch(), maint.refetch(), timelineExtras.refetch()]).then(() => undefined);
  }, [base, lav, pv, doc, log, mov, maint, timelineExtras]);

  return {
    data,
    isLoading,
    isError: isErrorEffective,
    error: hubTimedOut && !error ? new Error("Timeout caricamento dati mezzo") : error,
    isSuccess: hubReady && Boolean(data),
    refetch,
    status: isErrorEffective
      ? ("error" as const)
      : isLoading
        ? ("pending" as const)
        : hubReady
          ? ("success" as const)
          : ("pending" as const),
  };
}
