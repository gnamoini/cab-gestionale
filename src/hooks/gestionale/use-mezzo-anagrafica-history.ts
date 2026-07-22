"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchMezzoAnagraficaHistory,
  type MezzoAnagraficaHistoryRow,
} from "@/src/services/mezzo-anagrafica-history.service";

export function useMezzoAnagraficaHistory(mezzoId: string | undefined, limit = 20) {
  const id = mezzoId?.trim() ?? "";
  return useQuery<MezzoAnagraficaHistoryRow[]>({
    queryKey: ["mezzo-anagrafica-history", id, limit],
    queryFn: async () => {
      const res = await fetchMezzoAnagraficaHistory(id, limit);
      if (!res.success) throw new Error(res.error ?? "Errore storico anagrafica");
      return res.data ?? [];
    },
    enabled: id.length > 0,
    staleTime: 30_000,
  });
}
