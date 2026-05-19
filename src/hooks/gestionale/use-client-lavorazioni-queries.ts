"use client";

import { useServiceQuery } from "@/src/hooks/use-service-query";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { clientLavorazioniService } from "@/src/services/client-lavorazioni.service";

const STALE_MS = 15_000;

export function useClientLavorazioniListQuery(enabled: boolean) {
  return useServiceQuery(
    [...QK.clientLavorazioniList] as const,
    () => clientLavorazioniService.list(),
    { enabled, staleTime: STALE_MS },
  );
}

export function useClientLavorazioneDetailQuery(lavorazioneId: string | undefined, enabled: boolean) {
  const id = lavorazioneId?.trim() ?? "";
  return useServiceQuery(
    [...QK.clientLavorazioniDetail, id] as const,
    () => clientLavorazioniService.getDetail(id),
    { enabled: enabled && id.length > 0, staleTime: STALE_MS },
  );
}
