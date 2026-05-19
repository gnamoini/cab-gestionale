"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { mapSegnalazioneToSupportoNote } from "@/lib/supporto/segnalazioni-mapper";
import type { SupportoNote } from "@/lib/supporto/supporto-note-types";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { segnalazioniService } from "@/src/services/segnalazioni.service";

export function useSegnalazioniQuery(): UseQueryResult<SupportoNote[], Error> {
  const { status, user } = useAuth();

  return useQuery({
    queryKey: QK.segnalazioni,
    queryFn: async () => {
      const r = await segnalazioniService.list();
      if (!r.success) throw new Error(r.error ?? "Errore caricamento segnalazioni");
      return (r.data ?? []).map(mapSegnalazioneToSupportoNote);
    },
    enabled: isAuthSessionEstablished(status) && !!user?.id,
    staleTime: 60_000,
    gcTime: 300_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
  });
}
