"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { logEntry } from "@/lib/domain/log-entry";
import { movimentiEntry } from "@/lib/domain/movimenti-entry";
import { LOG_MODIFICHE_RETENTION_PER_ENTITA } from "@/lib/gestionale-log/log-modifiche-retention";
import { movimentiListQueryKey } from "@/lib/render/query-key-factory";
import { QK } from "@/src/lib/react-query/invalidate-related";

const MAG_LOG_FILTERS = {
  entita: "magazzino_ricambi",
  limit: LOG_MODIFICHE_RETENTION_PER_ENTITA,
} as const;

const MOV_LOG_FILTERS = {
  entita: "movimenti_ricambi",
  limit: LOG_MODIFICHE_RETENTION_PER_ENTITA,
} as const;

function scheduleIdleWork(work: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const ric = window.requestIdleCallback;
  if (ric) {
    const id = ric(work);
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(work, 0);
  return () => window.clearTimeout(id);
}

export type MagazzinoSecondaryQueryGateOpts = {
  /** Bypass idle — log drawer, modale info, ecc. */
  force?: boolean;
};

/**
 * Gate query secondarie magazzino (log, movimenti) dopo idle — non compete col first paint tabella.
 * `force` abilita fetch immediato (es. utente apre log o dettaglio info).
 */
export function useMagazzinoSecondaryQueryGate(opts?: MagazzinoSecondaryQueryGateOpts): boolean {
  const force = opts?.force ?? false;
  const qc = useQueryClient();
  const [idleReady, setIdleReady] = useState(false);

  useEffect(() => {
    if (force) return;
    return scheduleIdleWork(() => {
      setIdleReady(true);
      void Promise.all([
        qc.prefetchQuery({
          queryKey: movimentiListQueryKey(null),
          queryFn: async () => {
            const res = await movimentiEntry.getAll();
            if (!res.success) throw new Error(res.error ?? "Errore lettura movimenti");
            return res.data ?? [];
          },
        }),
        qc.prefetchQuery({
          queryKey: [...QK.log, MAG_LOG_FILTERS] as const,
          queryFn: async () => {
            const res = await logEntry.getAll(MAG_LOG_FILTERS);
            if (!res.success) throw new Error(res.error ?? "Errore lettura log");
            return res.data ?? [];
          },
        }),
        qc.prefetchQuery({
          queryKey: [...QK.log, MOV_LOG_FILTERS] as const,
          queryFn: async () => {
            const res = await logEntry.getAll(MOV_LOG_FILTERS);
            if (!res.success) throw new Error(res.error ?? "Errore lettura log");
            return res.data ?? [];
          },
        }),
      ]);
    });
  }, [qc, force]);

  return force || idleReady;
}
