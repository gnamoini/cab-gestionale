"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGlobalLoadingContextBridge } from "@/context/global-loading-context";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";
import { readGlobalLoadingMeta } from "@/src/lib/react-query/global-loading-meta";
import { useRealtimeStatus } from "@/src/context/realtime-status-context";

/**
 * Overlay globale per mutation/query con `meta.globalLoading: true` (opt-in).
 * Non modifica default React Query.
 */
export function GlobalLoadingQueryBridge() {
  const client = useQueryClient();
  const syncFromCaches = useGlobalLoadingContextBridge();
  const { gestionale } = useRealtimeStatus();
  const realtimeConnected = gestionale === "connected";

  useEffect(() => {
    const recompute = () => {
      const mutations = client
        .getMutationCache()
        .getAll()
        .filter((m) => m.state.status === "pending");
      const queries = client
        .getQueryCache()
        .getAll()
        .filter((q) => {
          if (q.state.fetchStatus !== "fetching") return false;
          const meta = q.meta as { suppressGlobalLoadingOnBackgroundRefetch?: boolean } | undefined;
          const suppressBg =
            meta?.suppressGlobalLoadingOnBackgroundRefetch === true ||
            (realtimeConnected && q.state.data !== undefined);
          if (suppressBg) return false;
          return q.state.status === "pending" || q.state.status === "success";
        });

      const pending = [
        ...mutations.map((m) => readGlobalLoadingMeta(m.options.meta)),
        ...queries.map((q) => readGlobalLoadingMeta(q.meta)),
      ].filter((m): m is NonNullable<typeof m> => m !== null);

      if (pending.length === 0) {
        syncFromCaches(null);
        return;
      }
      const last = pending[pending.length - 1]!;
      syncFromCaches(last.globalLoadingMessage?.trim() || GLOBAL_LOADING_MESSAGES.syncing);
    };

    const unsubM = client.getMutationCache().subscribe(recompute);
    const unsubQ = client.getQueryCache().subscribe(recompute);
    recompute();
    return () => {
      unsubM();
      unsubQ();
    };
  }, [client, realtimeConnected, syncFromCaches]);

  return null;
}
