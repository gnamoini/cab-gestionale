"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";
import {
  refetchActiveClientPortalMedia,
  refetchActiveSchedeBundles,
  runLavorazioniToolbarRefresh,
} from "@/src/lib/react-query/refetch-lavorazioni-operational-data";

type Refetchable = Pick<UseQueryResult<unknown, Error>, "refetch" | "isFetching" | "isError" | "error">;

export function useClientLavorazioniRefresh(...queries: (Refetchable | undefined)[]) {
  const qc = useQueryClient();
  const gestToast = useGestionaleToast();
  const queriesRef = useRef(queries);
  queriesRef.current = queries;

  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const active = queriesRef.current.filter((q): q is Refetchable => q != null);
      await runLavorazioniToolbarRefresh([
        ...active.map((q) => q.refetch()),
        refetchActiveSchedeBundles(qc),
        refetchActiveClientPortalMedia(qc),
      ]);
      gestToast.successOnce("client-lav-refresh", GESTIONALE_TOAST.successRefreshed);
    } catch (e) {
      gestToast.errorOnce("client-lav-refresh", e, { module: "lavorazioni" });
    } finally {
      setBusy(false);
    }
  }, [qc, gestToast]);

  return { refresh, busy, isFetching: busy };
}
