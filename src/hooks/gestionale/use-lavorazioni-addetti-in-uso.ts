"use client";

import { useQuery } from "@tanstack/react-query";
import { isAuthSessionEstablished, useAuth } from "@/context/auth-context";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { lavorazioniService } from "@/src/services/lavorazioni.service";

export function useLavorazioniAddettiInUsoQuery(options?: { enabled?: boolean }) {
  const { status } = useAuth();
  const enabled = (options?.enabled ?? true) && isAuthSessionEstablished(status);

  return useQuery({
    queryKey: [...QK.lavorazioniQueries, "addetti-in-uso"] as const,
    queryFn: async () => {
      const r = await lavorazioniService.getAddettiInUso();
      if (!r.success) throw new Error(r.error ?? "Errore addetti in uso");
      return r.data ?? { attivi: [], storico: [] };
    },
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
