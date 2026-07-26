"use client";

import { useQuery } from "@tanstack/react-query";
import { mezzoDomainQueryKeys } from "@/src/services/domain/mezzo-domain.queries";
import {
  fetchMezzoAnagraficaHistory,
  type MezzoAnagraficaHistoryRow,
} from "@/src/services/mezzo-anagrafica-history.service";

export function useMezzoAnagraficaHistory(
  mezzoId: string | undefined,
  options?: { limit?: number; enabled?: boolean },
) {
  const limit = options?.limit ?? 20;
  const id = mezzoId?.trim() ?? "";
  const enabled = (options?.enabled ?? true) && id.length > 0;
  return useQuery<MezzoAnagraficaHistoryRow[]>({
    queryKey: mezzoDomainQueryKeys.anagraficaHistory(id, limit),
    queryFn: async () => {
      const res = await fetchMezzoAnagraficaHistory(id, limit);
      if (!res.success) throw new Error(res.error ?? "Errore storico anagrafica");
      return res.data ?? [];
    },
    enabled,
    staleTime: 30_000,
  });
}
