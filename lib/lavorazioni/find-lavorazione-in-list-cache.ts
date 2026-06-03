import type { QueryClient } from "@tanstack/react-query";
import { QK } from "@/src/lib/react-query/query-keys";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

/** Read-only: cerca una lavorazione nelle liste già in cache React Query. */
export function findLavorazioneInListCache(
  qc: QueryClient,
  lavorazioneId: string,
): LavorazioneListRow | undefined {
  const id = lavorazioneId.trim();
  if (!id) return undefined;
  const entries = qc.getQueriesData<LavorazioneListRow[]>({ queryKey: QK.lavorazioniQueries });
  for (const [, data] of entries) {
    const hit = data?.find((r) => r.id === id);
    if (hit) return hit;
  }
  return undefined;
}
