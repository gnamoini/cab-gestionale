"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchMezzoSchedeHistory,
  type MezzoSchedaHistoryRow,
} from "@/src/services/domain/mezzo-schede-history.service";

export function useMezzoSchedeHistory(mezzoId: string | undefined) {
  const id = mezzoId?.trim() ?? "";
  return useQuery<MezzoSchedaHistoryRow[]>({
    queryKey: ["mezzo-schede-history", id],
    queryFn: () => fetchMezzoSchedeHistory(id),
    enabled: id.length > 0,
    staleTime: 30_000,
  });
}
