"use client";

import { useRealtimeStatus } from "@/src/context/realtime-status-context";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { clientLavorazioniService } from "@/src/services/client-lavorazioni.service";

/** Allineato al main gestionale; polling locale disabilitato (bridge globale). */
const STALE_MS = 30_000;

export function useClientPortalQueryOpts() {
  const { gestionale } = useRealtimeStatus();
  void gestionale;
  return {
    staleTime: STALE_MS,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  } as const;
}

/** In corso — stessa cache React Query della pagina Lavorazioni principale. */
export function useClientLavorazioniInCorsoQuery(enabled: boolean) {
  const opts = useClientPortalQueryOpts();
  return useLavorazioniList({ archived: false, includeMezzo: true }, { enabled, ...opts });
}

/** Archivio — stessa cache React Query della pagina Lavorazioni principale. */
export function useClientLavorazioniArchivioQuery(enabled: boolean) {
  const opts = useClientPortalQueryOpts();
  return useLavorazioniList({ archived: true, includeMezzo: true }, { enabled, ...opts });
}

/** @deprecated Usare useClientLavorazioniInCorsoQuery + useClientLavorazioniArchivioQuery. */
export function useClientLavorazioniListQuery(enabled: boolean) {
  const opts = useClientPortalQueryOpts();
  return useServiceQuery(
    [...QK.clientLavorazioniList] as const,
    () => clientLavorazioniService.list(),
    { enabled, ...opts },
  );
}

export function useClientLavorazioneDetailQuery(lavorazioneId: string | undefined, enabled: boolean) {
  const id = lavorazioneId?.trim() ?? "";
  const opts = useClientPortalQueryOpts();
  return useServiceQuery(
    [...QK.clientLavorazioniDetail, id] as const,
    () => clientLavorazioniService.getDetail(id),
    { enabled: enabled && id.length > 0, ...opts },
  );
}
