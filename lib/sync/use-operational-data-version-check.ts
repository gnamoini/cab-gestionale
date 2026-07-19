"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { fetchOperationalDataVersion } from "@/lib/sync/operational-data-version";
import { QK } from "@/src/lib/react-query/query-keys";

const VERSION_POLL_MS = 60_000;

/** PR-6 optional — refetch operational lists when DB version changes (no extra jitter). */
export function useOperationalDataVersionCheck(enabled = false): void {
  const qc = useQueryClient();
  const lastVersionRef = useRef<number | null>(null);

  const versionQ = useQuery({
    queryKey: [...QK.lavorazioniQueries, "operational-data-version"] as const,
    queryFn: fetchOperationalDataVersion,
    enabled,
    staleTime: VERSION_POLL_MS,
    refetchInterval: enabled ? VERSION_POLL_MS : false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!enabled || versionQ.data == null) return;
    const v = versionQ.data;
    if (lastVersionRef.current != null && v !== lastVersionRef.current) {
      void qc.invalidateQueries({ queryKey: QK.lavorazioniQueries, refetchType: "active" });
      void qc.invalidateQueries({ queryKey: QK.magazzino, refetchType: "active" });
      void qc.invalidateQueries({ queryKey: QK.mezzi, refetchType: "active" });
    }
    lastVersionRef.current = v;
  }, [enabled, qc, versionQ.data]);
}
