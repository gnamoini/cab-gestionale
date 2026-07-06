"use client";

import { useMemo } from "react";
import { preventivoDdtIndexQueryKey } from "@/lib/render/query-key-factory";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { ddtEntry } from "@/lib/domain/ddt-entry";
import type { DdtDocumentRow } from "@/src/types/supabase-tables";

export function usePreventivoDdtIndex(preventivoIds: readonly string[], enabled = true) {
  const gestOpts = useGestionaleQueryOpts();
  const stableIds = useMemo(
    () => [...new Set(preventivoIds.filter(Boolean))].sort(),
    [preventivoIds],
  );
  const q = useServiceQuery(
    preventivoDdtIndexQueryKey(stableIds),
    () => ddtEntry.fetchIndexByPreventivoIds(stableIds),
    {
      enabled: enabled && stableIds.length > 0,
      ...gestOpts,
    },
  );

  const byPreventivoId = useMemo(() => {
    const map = new Map<string, DdtDocumentRow>();
    for (const doc of q.data ?? []) {
      if (doc.preventivo_id && !map.has(doc.preventivo_id)) {
        map.set(doc.preventivo_id, doc);
      }
    }
    return map;
  }, [q.data]);

  return {
    getDdtForPreventivo: (preventivoId: string) => byPreventivoId.get(preventivoId) ?? null,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => void q.refetch(),
  };
}
