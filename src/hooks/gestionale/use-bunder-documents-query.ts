"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBunderDocuments, BUNDER_QUERY_KEY } from "@/lib/bunder/bunder-sync-adapter";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";

export function useBunderDocumentsQuery() {
  const opts = useGestionaleQueryOpts();
  return useQuery({
    queryKey: BUNDER_QUERY_KEY,
    queryFn: fetchBunderDocuments,
    ...opts,
  });
}

export function useBunderDocumentsQueryClient() {
  return useQueryClient();
}
