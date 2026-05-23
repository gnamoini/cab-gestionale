"use client";

import { useMemo } from "react";
import { mapPreventiviRowsToRecords } from "@/lib/preventivi/preventivi-records-from-cache";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import { usePreventiviListQuery, useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";

/** Lista preventivi da Supabase (React Query). */
export function usePreventiviRecordsQuery(enabled = true) {
  const gestOpts = useGestionaleQueryOpts();
  const pvQ = usePreventiviListQuery(undefined, { enabled, ...gestOpts });
  const mezziQ = useMezziListQuery(undefined, { enabled });

  const records = useMemo((): PreventivoRecord[] => {
    const mezzi = mezziQ.data ?? [];
    return mapPreventiviRowsToRecords(pvQ.data, mezzi);
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
