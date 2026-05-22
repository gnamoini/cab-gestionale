"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateClientPortalQueries } from "@/lib/lavorazioni/client-portal-invalidate";
import { dispatchClientPortalRefresh } from "@/lib/lavorazioni/client-portal-sync";
import { LAVORAZIONI_SCHEDE_STORE_CHANGED } from "@/src/hooks/use-lavorazione-schede-store-sync";
import type { UseQueryResult } from "@tanstack/react-query";

type Refetchable = Pick<UseQueryResult<unknown, Error>, "refetch" | "isFetching">;

export function useClientLavorazioniRefresh(...queries: (Refetchable | undefined)[]) {
  const qc = useQueryClient();
  const queriesRef = useRef(queries);
  queriesRef.current = queries;

  const isFetching = queries.some((q) => q?.isFetching) ?? false;
  const [manualPending, setManualPending] = useState(false);

  const refresh = useCallback(async () => {
    setManualPending(true);
    try {
      const active = queriesRef.current.filter((q): q is Refetchable => q != null);
      await Promise.all(active.map((q) => q.refetch()));
      await invalidateClientPortalQueries(qc);
      dispatchClientPortalRefresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(LAVORAZIONI_SCHEDE_STORE_CHANGED));
      }
    } finally {
      setManualPending(false);
    }
  }, [qc]);

  const busy = isFetching || manualPending;

  return { refresh, busy, isFetching: busy };
}
