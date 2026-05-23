"use client";

import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { clientLavorazioniService } from "@/src/services/client-lavorazioni.service";

/** @deprecated Usare `useGestionaleQueryOpts` — alias per compatibilità import portal. */
export function useClientPortalQueryOpts() {
  return useGestionaleQueryOpts();
}

/** In corso — stessa cache React Query della pagina Lavorazioni principale. */
export function useClientLavorazioniInCorsoQuery(enabled: boolean) {
  const opts = useGestionaleQueryOpts();
  return useLavorazioniList({ archived: false, includeMezzo: true }, { enabled, ...opts });
}

/** Archivio — stessa cache React Query della pagina Lavorazioni principale. */
export function useClientLavorazioniArchivioQuery(enabled: boolean) {
  const opts = useGestionaleQueryOpts();
  return useLavorazioniList({ archived: true, includeMezzo: true }, { enabled, ...opts });
}

export function useClientLavorazioneDetailQuery(lavorazioneId: string | undefined, enabled: boolean) {
  const id = lavorazioneId?.trim() ?? "";
  const opts = useGestionaleQueryOpts();
  return useServiceQuery(
    [...QK.clientLavorazioniDetail, id] as const,
    () => clientLavorazioniService.getDetail(id),
    { enabled: enabled && id.length > 0, ...opts },
  );
}
