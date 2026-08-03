"use client";

import { useViewQueryOpts } from "@/lib/view/view-query-opts";
import { useQuery } from "@tanstack/react-query";
import { CLIENT_PORTAL_ARCHIVIO_COUNT_FILTERS } from "@/lib/lavorazioni/client-portal-prefetch-filters";
import { fetchLavorazioniListCountAuthorized } from "@/lib/lavorazioni/lavorazioni-list-fetch";
import { lavorazioniListCountQueryKey } from "@/lib/lavorazioni/lavorazioni-list-query-keys";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { clientLavorazioniEntry } from "@/lib/domain/client-lavorazioni-entry";

const ARCHIVIO_COUNT_FILTERS = CLIENT_PORTAL_ARCHIVIO_COUNT_FILTERS;

/** In corso — cache dedicata portale (`clientPortal`) con eventuale filtro `cliente_ref`. */
export function useClientLavorazioniInCorsoQuery(enabled: boolean) {
  const opts = useViewQueryOpts();
  return useLavorazioniList(
    { archived: false, includeMezzo: true, fetchMode: "light", includeProfiles: true },
    { ...opts, enabled, clientPortal: true, refetchOnMount: "always" },
  );
}

/** Archivio — cache dedicata portale (`clientPortal`) con eventuale filtro `cliente_ref`. */
export function useClientLavorazioniArchivioQuery(enabled: boolean) {
  const opts = useViewQueryOpts();
  return useLavorazioniList(
    { archived: true, includeMezzo: true, fetchMode: "light", includeProfiles: true },
    { ...opts, enabled, clientPortal: true, refetchOnMount: "always" },
  );
}

/** Conteggio archivio (head) — solo quando la lista non è attiva e non c'è cache prefetch. */
export function useClientLavorazioniArchivioCountQuery(enabled: boolean) {
  const opts = useViewQueryOpts({ staleTime: 30_000 });
  return useQuery({
    queryKey: lavorazioniListCountQueryKey(ARCHIVIO_COUNT_FILTERS, true),
    queryFn: async () => {
      const res = await fetchLavorazioniListCountAuthorized(ARCHIVIO_COUNT_FILTERS, { clientPortal: true });
      if (!res.success) throw new Error(res.error ?? "Errore conteggio archivio");
      return res.data ?? 0;
    },
    enabled,
    ...opts,
  });
}

export function useClientLavorazioneDetailQuery(lavorazioneId: string | undefined, enabled: boolean) {
  const id = lavorazioneId?.trim() ?? "";
  const opts = useViewQueryOpts();
  return useServiceQuery(
    [...QK.clientLavorazioniDetail, id] as const,
    () => clientLavorazioniEntry.getDetail(id),
    { enabled: enabled && id.length > 0, ...opts },
  );
}
