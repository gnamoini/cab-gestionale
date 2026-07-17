"use client";

import type { QueryClient } from "@tanstack/react-query";
import type { SistemaSectionId } from "@/components/dashboard/settings/settings-workspace-types";
import { lavorazioniEntry } from "@/lib/domain/lavorazioni-entry";
import { QK } from "@/src/lib/react-query/invalidate-related";

const IN_USO_STALE_MS = 60_000;

/** Prefetch in-uso prima del render sezione operatività (warm cache su navigazione). */
export function prefetchImpostazioniInUsoQueries(qc: QueryClient, sectionId: SistemaSectionId): void {
  if (sectionId === "op-stati") {
    void qc.prefetchQuery({
      queryKey: [...QK.lavorazioniQueries, "stati-in-uso"] as const,
      queryFn: async () => {
        const r = await lavorazioniEntry.listStatiInUso();
        if (!r.success) throw new Error(r.error ?? "Errore stati in uso");
        return r.data ?? { attivi: [], storico: [] };
      },
      staleTime: IN_USO_STALE_MS,
    });
    return;
  }
  if (sectionId === "op-addetti") {
    void qc.prefetchQuery({
      queryKey: [...QK.lavorazioniQueries, "addetti-in-uso"] as const,
      queryFn: async () => {
        const r = await lavorazioniEntry.listAddettiInUso();
        if (!r.success) throw new Error(r.error ?? "Errore addetti in uso");
        return r.data ?? { attivi: [], storico: [] };
      },
      staleTime: IN_USO_STALE_MS,
    });
  }
}
