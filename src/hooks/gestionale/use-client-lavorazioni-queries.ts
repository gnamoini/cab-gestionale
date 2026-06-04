"use client";

import { useViewQueryOpts } from "@/lib/view/view-query-opts";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { clientLavorazioniService } from "@/src/services/client-lavorazioni.service";

/** In corso — cache dedicata portale (`clientPortal`) con eventuale filtro `cliente_ref`. */
export function useClientLavorazioniInCorsoQuery(enabled: boolean) {
  const opts = useViewQueryOpts();
  return useLavorazioniList(
    { archived: false, includeMezzo: true },
    { enabled, clientPortal: true, ...opts },
  );
}

/** Archivio — cache dedicata portale (`clientPortal`) con eventuale filtro `cliente_ref`. */
export function useClientLavorazioniArchivioQuery(enabled: boolean) {
  const opts = useViewQueryOpts();
  return useLavorazioniList(
    { archived: true, includeMezzo: true },
    { enabled, clientPortal: true, ...opts },
  );
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
