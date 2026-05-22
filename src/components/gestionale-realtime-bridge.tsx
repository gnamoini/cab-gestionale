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
import {
  broadcastCabSyncEvent,
  broadcastGestionaleInvalidate,
  subscribeGestionaleBroadcast,
} from "@/lib/sync/cab-realtime-broadcast";
import { cabSyncEventFromPostgresChange, emitCabSyncEvent } from "@/lib/sync/cab-sync-bus";
import { dispatchGestionaleRemoteChange } from "@/lib/sync/gestionale-sync-dispatch";
import { useRealtimeStatus } from "@/src/context/realtime-status-context";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

const RECONNECT_MAX_ATTEMPTS = 5;

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
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let activeChannel: Awaited<ReturnType<typeof subscribePostgresChangesChannel>>["channel"] | null = null;
    let reconnecting = false;
    let reconnectAttempts = 0;
    const pendingTables = new Set<string>();
    const pendingCabEvents: ReturnType<typeof cabSyncEventFromPostgresChange>[] = [];
    const recentFingerprints = new Map<string, number>();
    const PRUNE_MS = 5000;

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

    const flushInvalidations = () => {
      if (cancelled || pendingTables.size === 0) return;
      const tables = [...pendingTables];
      const cabEvents = pendingCabEvents.filter((e): e is NonNullable<typeof e> => e != null);
      pendingTables.clear();
      pendingCabEvents.length = 0;

      dispatchGestionaleRemoteChange(qc, tables, cabEvents[0] ?? undefined, {
        emitLocalCabSync: true,
        cabSyncEvents: cabEvents.slice(1),
      });
      broadcastGestionaleInvalidate(tables);
      for (const ev of cabEvents) broadcastCabSyncEvent(ev);
    };

    const scheduleInvalidate = (table: string, cabEvent?: ReturnType<typeof cabSyncEventFromPostgresChange>) => {
      pendingTables.add(table);
      if (cabEvent) pendingCabEvents.push(cabEvent);
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

      const cabEvent = cabSyncEventFromPostgresChange(table, payload);
      scheduleInvalidate(table, cabEvent ?? undefined);
    };

    const removeActiveChannel = async () => {
      const sb = getBrowserSupabase();
      if (activeChannel) {
        try {
          await sb.removeChannel(activeChannel);
        } catch {
          /* ignore */
        }
        activeChannel = null;
      }
    };

    const connectRealtime = async () => {
      if (cancelled || reconnecting) return;
      reconnecting = true;

      await removeActiveChannel();

      const sb = getBrowserSupabase();
      const tables = GESTIONALE_REALTIME_TABLES.map((s) => ({ table: s.table }));

      const { channel, subscribed } = await subscribePostgresChangesChannel(sb, {
        channelName: "cab-gestionale-rt",
        tables,
        onPayload,
        retryAttempts: GESTIONALE_REALTIME_RETRY_ATTEMPTS,
        logPrefix: "[gestionale rt]",
        onStatusChange: (s) => {
          if (!cancelled) setGestionaleStatus(s === "connected" ? "connected" : "polling");
        },
        onPollingFallback: () => {
          if (!cancelled) {
            console.warn(
              `[gestionale rt] subscription non disponibile: fallback polling ${GESTIONALE_REALTIME_POLL_MS}ms`,
            );
            startPollingFallback();
          }
        },
        onChannelLost: () => {
          if (cancelled) return;
          setGestionaleStatus("polling");
          void removeActiveChannel().then(() => {
            if (cancelled) return;
            if (reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
              console.warn("[gestionale rt] max reconnect attempts — polling fallback");
              startPollingFallback();
              return;
            }
            reconnectAttempts += 1;
            const backoff = Math.min(1000 * 2 ** reconnectAttempts, 30_000);
            reconnectTimer = setTimeout(() => {
              reconnectTimer = null;
              reconnecting = false;
              void connectRealtime();
            }, backoff);
          });
        },
      });

      reconnecting = false;

      if (cancelled) {
        if (subscribed) await sb.removeChannel(channel);
        return;
      }

      if (subscribed) {
        activeChannel = channel;
        reconnectAttempts = 0;
        stopPollingFallback();
        setGestionaleStatus("connected");
      } else {
        startPollingFallback();
      }
    };

    const unsubBroadcast = subscribeGestionaleBroadcast({
      onInvalidate: (tables) => {
        if (cancelled) return;
        dispatchGestionaleRemoteChange(qc, tables);
      },
      onCabSync: (event) => {
        if (cancelled) return;
        emitCabSyncEvent(event);
      },
    });

    void connectRealtime();

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      stopPollingFallback();
      unsubBroadcast();
      pendingTables.clear();
      pendingCabEvents.length = 0;
      setGestionaleStatus("idle");
      void removeActiveChannel();
    };
  }, [authReady, qc, setGestionaleStatus, user?.id]);

  return null;
}
