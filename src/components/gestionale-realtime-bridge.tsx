"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { isSupabasePublicEnvConfigured } from "@/lib/env/supabase-public";
import {
  GESTIONALE_REALTIME_DEBOUNCE_MS,
  GESTIONALE_REALTIME_POLL_MS,
  GESTIONALE_REALTIME_RETRY_ATTEMPTS,
  GESTIONALE_REALTIME_TABLES,
  invalidateAllGestionaleOperationalQueries,
} from "@/lib/realtime/gestionale-realtime-config";
import {
  postgresChangeFingerprint,
  subscribePostgresChangesChannel,
  type PostgresChangePayload,
} from "@/lib/realtime/postgres-changes-channel";
import { broadcastGestionaleInvalidate, subscribeGestionaleBroadcast } from "@/lib/sync/cab-realtime-broadcast";
import { emitCabSyncFromPostgresChange } from "@/lib/sync/cab-sync-bus";
import { useRealtimeStatus } from "@/src/context/realtime-status-context";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

/**
 * Bridge Realtime globale: invalida cache React Query su cambi DB condivisi.
 * Fallback polling solo se la subscription Realtime non è disponibile.
 */
export function GestionaleRealtimeBridge() {
  const qc = useQueryClient();
  const { user, status } = useAuth();
  const { setGestionaleStatus } = useRealtimeStatus();
  const authReady = isAuthSessionEstablished(status) && !!user?.id;

  useEffect(() => {
    if (!authReady || !isSupabasePublicEnvConfigured()) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let activeChannel: Awaited<ReturnType<typeof subscribePostgresChangesChannel>>["channel"] | null = null;
    const pendingTables = new Set<string>();
    const recentFingerprints = new Map<string, number>();
    const PRUNE_MS = 5000;

    const flushInvalidations = () => {
      if (cancelled || pendingTables.size === 0) return;
      const tables = [...pendingTables];
      pendingTables.clear();
      for (const table of tables) {
        const spec = GESTIONALE_REALTIME_TABLES.find((s) => s.table === table);
        spec?.invalidate(qc);
      }
      broadcastGestionaleInvalidate(tables);
    };

    const scheduleInvalidate = (table: string) => {
      pendingTables.add(table);
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        flushInvalidations();
      }, GESTIONALE_REALTIME_DEBOUNCE_MS);
    };

    const onPayload = (table: string, payload: PostgresChangePayload) => {
      if (cancelled) return;

      const fp = postgresChangeFingerprint(table, payload);
      const now = Date.now();
      for (const [k, t] of recentFingerprints) {
        if (now - t > PRUNE_MS) recentFingerprints.delete(k);
      }
      if (recentFingerprints.has(fp)) return;
      recentFingerprints.set(fp, now);

      emitCabSyncFromPostgresChange(table, payload);
      scheduleInvalidate(table);
    };

    const startPollingFallback = () => {
      if (pollTimer) return;
      setGestionaleStatus("polling");
      pollTimer = setInterval(() => {
        if (cancelled) return;
        invalidateAllGestionaleOperationalQueries(qc);
      }, GESTIONALE_REALTIME_POLL_MS);
    };

    const stopPollingFallback = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const unsubBroadcast = subscribeGestionaleBroadcast((tables) => {
      if (cancelled) return;
      for (const table of tables) scheduleInvalidate(table);
    });

    void (async () => {
      const sb = getBrowserSupabase();
      const tables = GESTIONALE_REALTIME_TABLES.map((s) => ({ table: s.table }));

      const { channel, subscribed } = await subscribePostgresChangesChannel(sb, {
        channelName: "cab-gestionale-rt",
        tables,
        onPayload,
        retryAttempts: GESTIONALE_REALTIME_RETRY_ATTEMPTS,
        logPrefix: "[gestionale rt]",
        onStatusChange: (s) => setGestionaleStatus(s === "connected" ? "connected" : "polling"),
        onPollingFallback: () => {
          if (!cancelled) {
            console.warn(`[gestionale rt] subscription non disponibile: fallback polling ${GESTIONALE_REALTIME_POLL_MS}ms`);
            startPollingFallback();
          }
        },
      });

      if (subscribed) {
        activeChannel = channel;
        stopPollingFallback();
        setGestionaleStatus("connected");
      } else if (!cancelled) {
        startPollingFallback();
      }
    })();

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      stopPollingFallback();
      unsubBroadcast();
      pendingTables.clear();
      setGestionaleStatus("idle");
      const sb = getBrowserSupabase();
      if (activeChannel) {
        void sb.removeChannel(activeChannel);
        activeChannel = null;
      }
    };
  }, [authReady, qc, setGestionaleStatus, user?.id]);

  return null;
}
