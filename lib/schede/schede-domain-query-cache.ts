import type { QueryClient } from "@tanstack/react-query";
import { QK } from "@/src/lib/react-query/query-keys";
import type { SchedaLavorazioneRow } from "@/src/types/supabase-tables";

/** Chiave RQ allineata a `lavorazioniDomainQueryKeys.schede` (hub / dominio). */
export function lavorazioneSchedeRowsQueryKey(lavorazioneId: string) {
  return [...QK.lavorazioniQueries, "schede", lavorazioneId.trim()] as const;
}

/** Prime la cache righe schede quando il bundle viene caricato via `ensureSchedeBundlesInCache`. */
export function primeLavorazioneSchedeRowsCache(
  qc: QueryClient,
  lavorazioneId: string,
  rows: readonly SchedaLavorazioneRow[],
): void {
  const id = lavorazioneId.trim();
  if (!id) return;
  qc.setQueryData(lavorazioneSchedeRowsQueryKey(id), [...rows]);
}
