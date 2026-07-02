import type { QueryClient } from "@tanstack/react-query";
import { QK } from "@/src/lib/react-query/query-keys";
import { isLavorazioniListQueryKey } from "@/lib/lavorazioni/lavorazioni-list-query-keys";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

/** Read-only: tutte le righe lavorazioni in cache React Query. */
export function getLavorazioniListFromCache(qc: QueryClient): LavorazioneListRow[] {
  const entries = qc.getQueriesData<LavorazioneListRow[]>({ queryKey: QK.lavorazioniQueries });
  const out: LavorazioneListRow[] = [];
  const seen = new Set<string>();
  for (const [queryKey, data] of entries) {
    if (!isLavorazioniListQueryKey(queryKey) || !Array.isArray(data)) continue;
    for (const row of data) {
      if (!row?.id || seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(row);
    }
  }
  return out;
}

/** Read-only: cerca una lavorazione nelle liste già in cache React Query. */
export function findLavorazioneInListCache(
  qc: QueryClient,
  lavorazioneId: string,
): LavorazioneListRow | undefined {
  const id = lavorazioneId.trim();
  if (!id) return undefined;
  return getLavorazioniListFromCache(qc).find((r) => r.id === id);
}
