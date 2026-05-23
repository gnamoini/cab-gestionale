"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QK } from "@/src/lib/react-query/query-keys";
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
      void qc.invalidateQueries({ queryKey: QK.schede, refetchType: "active" });
    } finally {
      setManualPending(false);
    }
  }, [qc]);

  const busy = isFetching || manualPending;

  return { refresh, busy, isFetching: busy };
}
