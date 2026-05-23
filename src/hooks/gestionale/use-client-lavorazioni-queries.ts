"use client";

import { useViewQueryOpts } from "@/lib/view/view-query-opts";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { clientLavorazioniService } from "@/src/services/client-lavorazioni.service";

/** In corso — stessa cache React Query della pagina Lavorazioni principale (VIEW layer). */
export function useClientLavorazioniInCorsoQuery(enabled: boolean) {
  const opts = useViewQueryOpts();
  return useLavorazioniList({ archived: false, includeMezzo: true }, { enabled, ...opts });
}

/** Archivio — stessa cache React Query della pagina Lavorazioni principale (VIEW layer). */
export function useClientLavorazioniArchivioQuery(enabled: boolean) {
  const opts = useViewQueryOpts();
  return useLavorazioniList({ archived: true, includeMezzo: true }, { enabled, ...opts });
}

export function useClientLavorazioneDetailQuery(lavorazioneId: string | undefined, enabled: boolean) {
  const id = lavorazioneId?.trim() ?? "";
  const opts = useViewQueryOpts();
  return useServiceQuery(
    [...QK.clientLavorazioniDetail, id] as const,
    () => clientLavorazioniService.getDetail(id),
    { enabled: enabled && id.length > 0, ...opts },
  );
}
