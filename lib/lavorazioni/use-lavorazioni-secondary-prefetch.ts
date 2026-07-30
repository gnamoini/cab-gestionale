"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { logEntry } from "@/lib/domain/log-entry";
import { magazzinoEntry } from "@/lib/domain/magazzino-entry";
import { LOG_MODIFICHE_RETENTION_PER_ENTITA } from "@/lib/gestionale-log/log-modifiche-retention";
import { magazzinoListQueryKey } from "@/lib/render/query-key-factory";
import { QK } from "@/src/lib/react-query/invalidate-related";

const LAVORAZIONI_LOG_FILTERS = {
  entita: "lavorazioni",
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

/**
 * Gate query secondarie (magazzino, log) dopo idle prefetch — non blocca il mount tabella.
 * `forceEnable` (es. drawer log / modal creazione) abilita subito senza nuovo loading percepito.
 */
export function useLavorazioniSecondaryQueryGate(forceEnable = false): boolean {
  const qc = useQueryClient();
  const [idleReady, setIdleReady] = useState(false);

  useEffect(() => {
    return scheduleIdleWork(() => {
      setIdleReady(true);
      void Promise.all([
        qc.prefetchQuery({
          queryKey: magazzinoListQueryKey("list", null),
          queryFn: async () => {
            const res = await magazzinoEntry.getAll();
            if (!res.success) throw new Error(res.error ?? "Errore lettura magazzino");
            return res.data ?? [];
          },
        }),
        qc.prefetchQuery({
          queryKey: [...QK.log, LAVORAZIONI_LOG_FILTERS] as const,
          queryFn: async () => {
            const res = await logEntry.getAll(LAVORAZIONI_LOG_FILTERS);
            if (!res.success) throw new Error(res.error ?? "Errore lettura log");
            return res.data ?? [];
          },
        }),
      ]);
    });
  }, [qc]);

  return forceEnable || idleReady;
}
