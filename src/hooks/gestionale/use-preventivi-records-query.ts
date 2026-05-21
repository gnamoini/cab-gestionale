"use client";

import { useEffect, useMemo } from "react";
import { mergeLoadedPreventivi } from "@/lib/preventivi/preventivi-sync-adapter";
import { loadPreventivi } from "@/lib/preventivi/preventivi-storage";
import { CAB_PREVENTIVI_REFRESH } from "@/lib/sistema/cab-events";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import { useCabSyncListener } from "@/src/hooks/use-cab-sync-listener";
import { usePreventiviListQuery, useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useQueryClient } from "@tanstack/react-query";
import { QK } from "@/src/lib/react-query/invalidate-related";

const LIST_OPTS = {
  staleTime: 5_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;

/** Lista preventivi: merge DB (React Query) + localStorage (dual-write). */
export function usePreventiviRecordsQuery(enabled = true) {
  const qc = useQueryClient();
  const pvQ = usePreventiviListQuery(undefined, { enabled, ...LIST_OPTS });
  const mezziQ = useMezziListQuery(undefined, { enabled });

  useCabSyncListener("preventivi", () => {
    void qc.invalidateQueries({ queryKey: QK.preventivi });
  });

  useEffect(() => {
    const onRefresh = () => void qc.invalidateQueries({ queryKey: QK.preventivi });
    window.addEventListener(CAB_PREVENTIVI_REFRESH, onRefresh);
    return () => window.removeEventListener(CAB_PREVENTIVI_REFRESH, onRefresh);
  }, [qc]);

  const records = useMemo((): PreventivoRecord[] => {
    const local = loadPreventivi();
    const mezzi = mezziQ.data ?? [];
    if (pvQ.data) return mergeLoadedPreventivi(local, pvQ.data, mezzi);
    return local;
  }, [pvQ.data, pvQ.dataUpdatedAt, mezziQ.data]);

  return {
    records,
    isLoading: pvQ.isLoading || mezziQ.isLoading,
    isError: pvQ.isError,
    error: pvQ.error,
    refetch: () => {
      void pvQ.refetch();
    },
  };
}
