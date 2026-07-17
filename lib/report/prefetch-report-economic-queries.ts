import type { QueryClient } from "@tanstack/react-query";
import { invoicesEntry } from "@/lib/domain/invoices-entry";
import { fetchPreventiviRecordsAuthorized } from "@/lib/preventivi/preventivi-list-fetch-authorized";
import { fatturazioneListQueryKey, preventiviRecordsQueryKey } from "@/lib/render/query-key-factory";

/** Prefetch preventivi + fatturazione quando l'utente apre sezioni economiche report. */
export function prefetchReportEconomicQueries(qc: QueryClient) {
  return Promise.all([
    qc.prefetchQuery({
      queryKey: preventiviRecordsQueryKey(),
      queryFn: () => fetchPreventiviRecordsAuthorized(),
    }),
    qc.prefetchQuery({
      queryKey: fatturazioneListQueryKey(),
      queryFn: () => invoicesEntry.getList(),
    }),
  ]);
}
