"use client";

import {
  fetchPreventiviRecordsAuthorized,
  type PreventiviRecordsPayload,
} from "@/lib/preventivi/preventivi-list-fetch-authorized";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { QK } from "@/src/lib/react-query/query-keys";

const PREVENTIVI_RECORDS_KEY = [...QK.preventivi, null] as const;

/** Lista preventivi — 1 query Supabase con embed mezzi (no join client). */
export function usePreventiviRecordsQuery(enabled = true) {
  const gestOpts = useGestionaleQueryOpts();
  const q = useServiceQuery(PREVENTIVI_RECORDS_KEY, () => fetchPreventiviRecordsAuthorized(), {
    enabled,
    ...gestOpts,
  });

  const payload = q.data;
  const records = payload?.records ?? [];
  const mezziRows = payload?.mezziRows ?? [];

  return {
    records,
    mezziRows,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => void q.refetch(),
  };
}

export type { PreventiviRecordsPayload };
