"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchOrdineFornitoreInTransitMapClient } from "@/lib/ordini-fornitori/ordine-fornitore-in-transit-client";
import { QK } from "@/src/lib/react-query/query-keys";

export function useOrdineFornitoreInTransitMap(ricambioIds?: string[]) {
  const stableKey = ricambioIds?.length ? ricambioIds.join(",") : "all";
  return useQuery({
    queryKey: [...QK.ordiniFornitori, "in-transit", stableKey] as const,
    queryFn: async () => {
      const res = await fetchOrdineFornitoreInTransitMapClient(ricambioIds);
      if (!res.success) throw new Error(res.error ?? "Errore in consegna");
      return res.data ?? {};
    },
    staleTime: 30_000,
  });
}
