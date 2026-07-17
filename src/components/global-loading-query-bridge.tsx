"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGlobalLoadingContextBridge } from "@/context/global-loading-context";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";
import { readGlobalLoadingMeta } from "@/src/lib/react-query/global-loading-meta";
import { useRealtimeConnected } from "@/src/context/realtime-status-context";

/**
 * Overlay globale per mutation/query con `meta.globalLoading: true` (opt-in).
 * Non modifica default React Query.
 */
export function GlobalLoadingQueryBridge() {
  const client = useQueryClient();
  const syncFromCaches = useGlobalLoadingContextBridge();
  const realtimeConnected = useRealtimeConnected();

  useEffect(() => {
    let raf = 0;
    const recompute = () => {
      const mutations = client
        .getMutationCache()
        .getAll()
        .filter((m) => m.state.status === "pending" && readGlobalLoadingMeta(m.options.meta) !== null);
      const queries = client
        .getQueryCache()
        .getAll()
        .filter((q) => {
          if (readGlobalLoadingMeta(q.meta) === null) return false;
          if (q.state.fetchStatus !== "fetching") return false;
          const meta = q.meta as { suppressGlobalLoadingOnBackgroundRefetch?: boolean } | undefined;
          const suppressBg =
            meta?.suppressGlobalLoadingOnBackgroundRefetch === true ||
            (realtimeConnected && q.state.data !== undefined);
          if (suppressBg) return false;
          return q.state.status === "pending" || q.state.status === "success";
        });

      const pending = [
        ...mutations.map((m) => readGlobalLoadingMeta(m.options.meta)!),
        ...queries.map((q) => readGlobalLoadingMeta(q.meta)!),
      ];

      if (pending.length === 0) {
        syncFromCaches(null);
        return;
      }
      const last = pending[pending.length - 1]!;
      syncFromCaches(last.globalLoadingMessage?.trim() || GLOBAL_LOADING_MESSAGES.syncing);
    };

    const scheduleRecompute = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        recompute();
      });
    };

    const unsubM = client.getMutationCache().subscribe(scheduleRecompute);
    const unsubQ = client.getQueryCache().subscribe(scheduleRecompute);
    recompute();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      unsubM();
      unsubQ();
    };
  }, [client, realtimeConnected, syncFromCaches]);

  return null;
}
