"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { QK } from "@/src/lib/react-query/query-keys";

const VERSION_POLL_MS = 60_000;

async function fetchOperationalDataVersion(): Promise<number> {
  const sb = getBrowserSupabase();
  const { data, error } = await sb.rpc("get_operational_data_version");
  if (error) throw new Error(error.message);
  return typeof data === "number" ? data : Number(data ?? 0);
}

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
