import type { QueryClient } from "@tanstack/react-query";
import { invoicesEntry } from "@/lib/domain/invoices-entry";
import { fetchPreventiviRecordsAuthorized } from "@/lib/preventivi/preventivi-list-fetch-authorized";
import { fatturazioneListQueryKey, preventiviRecordsQueryKey } from "@/lib/render/query-key-factory";
import type { ServiceResult } from "@/src/services/service-result";

function unwrapServiceResult<T>(result: ServiceResult<T>): T {
  if (!result.success) throw new Error(result.error ?? "Errore servizio");
  return result.data as T;
}

/** Prefetch preventivi + fatturazione quando l'utente apre sezioni economiche report. */
export function prefetchReportEconomicQueries(qc: QueryClient) {
  return Promise.all([
    qc.prefetchQuery({
      queryKey: preventiviRecordsQueryKey(),
      queryFn: async () => unwrapServiceResult(await fetchPreventiviRecordsAuthorized()),
    }),
    qc.prefetchQuery({
      queryKey: fatturazioneListQueryKey(),
      queryFn: async () => unwrapServiceResult(await invoicesEntry.getList()),
    }),
  ]);
}
