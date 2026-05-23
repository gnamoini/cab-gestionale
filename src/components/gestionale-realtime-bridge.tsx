"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { isSupabasePublicEnvConfigured } from "@/lib/env/supabase-public";
import {
  appSettingsChangeFingerprint,
  isOwnAppSettingsWrite,
  REMOTE_SETTINGS_NOTIFY_DEBOUNCE_MS,
  shouldShowRemoteSettingsToast,
} from "@/lib/realtime/app-settings-realtime-handlers";
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
import { shouldSuppressSettingsRemoteNotify } from "@/lib/sistema/settings-remote-notify-guard";
import { subscribeGestionaleBroadcast } from "@/lib/sync/cab-realtime-broadcast";
import { cabSyncEventFromPostgresChange } from "@/lib/sync/cab-sync-bus";
import { dispatchGestionaleAction } from "@/lib/sync/gestionale-sync-dispatch";
import { refetchActiveOperationalSnapshot } from "@/lib/sync/gestionale-snapshot-recovery";
import { useRealtimeStatus } from "@/src/context/realtime-status-context";
import { useSettingsModalOpen } from "@/src/context/settings-modal-open-context";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

const RECONNECT_MAX_ATTEMPTS = 5;

/**
 * Bridge Realtime unificato: tabelle operative + `app_settings`.
 * Invalidazione via `dispatchGestionaleAction` → `invalidate-targets`.
 */
export function GestionaleRealtimeBridge() {
  const qc = useQueryClient();
  const { user, status } = useAuth();
  const { push } = useToast();
  const pushRef = useRef(push);
  pushRef.current = push;
  const pathname = usePathname();
  const { isOpen: settingsModalOpen } = useSettingsModalOpen();
  const { setGestionaleStatus, setSettingsStatus } = useRealtimeStatus();
  const authReady = isAuthSessionEstablished(status) && !!user?.id;
  const rtConnectedRef = useRef(false);
  const settingsModalOpenRef = useRef(settingsModalOpen);
  settingsModalOpenRef.current = settingsModalOpen;
  const onSettingsPageRef = useRef(false);
  onSettingsPageRef.current = pathname?.startsWith("/impostazioni") ?? false;
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  useEffect(() => {
    if (!authReady || !isSupabasePublicEnvConfigured()) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let remoteSettingsNotifyTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let activeChannel: Awaited<ReturnType<typeof subscribePostgresChangesChannel>>["channel"] | null = null;
    let reconnecting = false;
    let reconnectAttempts = 0;
    let wasPolling = false;
    const pendingTables = new Set<string>();
    const pendingCabEvents: ReturnType<typeof cabSyncEventFromPostgresChange>[] = [];
    const pendingEntityIdByTable = new Map<string, string>();
    const recentFingerprints = new Map<string, number>();
    const PRUNE_MS = 5000;

    const setConnectionStatus = (next: "connected" | "polling" | "idle") => {
      setGestionaleStatus(next);
      setSettingsStatus(next);
    };

    const isSettingsEditorActive = () =>
      settingsModalOpenRef.current || onSettingsPageRef.current || shouldSuppressSettingsRemoteNotify();

    const scheduleRemoteSettingsNotify = () => {
      if (isSettingsEditorActive()) return;
      if (remoteSettingsNotifyTimer) return;
      remoteSettingsNotifyTimer = setTimeout(() => {
        remoteSettingsNotifyTimer = null;
        if (cancelled || isSettingsEditorActive()) return;
        if (!shouldShowRemoteSettingsToast()) return;
        pushRef.current("Un utente ha aggiornato le impostazioni", "info", 4500);
      }, REMOTE_SETTINGS_NOTIFY_DEBOUNCE_MS);
    };

    const startPollingFallback = () => {
      if (pollTimer) return;
      wasPolling = true;
      rtConnectedRef.current = false;
      setConnectionStatus("polling");
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

      const entityIdByTable = new Map(pendingEntityIdByTable);
      pendingEntityIdByTable.clear();

      dispatchGestionaleAction(qc, tables, {
        source: "realtime",
        cabSyncEvents: cabEvents,
        entityIdByTable,
      });
    };

    const scheduleInvalidate = (table: string, cabEvent?: ReturnType<typeof cabSyncEventFromPostgresChange>) => {
      pendingTables.add(table);
      if (cabEvent) {
        pendingCabEvents.push(cabEvent);
        if (cabEvent.type !== "settings_updated" && cabEvent.table && cabEvent.id) {
          pendingEntityIdByTable.set(cabEvent.table, cabEvent.id);
        }
      }
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        flushInvalidations();
      }, GESTIONALE_REALTIME_DEBOUNCE_MS);
    };

    const onPayload = (table: string, payload: PostgresChangePayload) => {
      if (cancelled) return;

      if (table === "app_settings") {
        if (shouldSuppressSettingsRemoteNotify()) return;
        if (isOwnAppSettingsWrite(userIdRef.current, payload)) return;
        if (isSettingsEditorActive()) return;

        const settingsFp = appSettingsChangeFingerprint(payload);
        const now = Date.now();
        for (const [k, t] of recentFingerprints) {
          if (now - t > PRUNE_MS) recentFingerprints.delete(k);
        }
        if (recentFingerprints.has(settingsFp)) return;
        recentFingerprints.set(settingsFp, now);

        const cabEvent = cabSyncEventFromPostgresChange(table, payload) ?? { type: "settings_updated" as const };
        scheduleInvalidate(table, cabEvent);
        scheduleRemoteSettingsNotify();
        return;
      }

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
          if (cancelled) return;
          const next = s === "connected" ? "connected" : "polling";
          rtConnectedRef.current = next === "connected";
          if (next === "connected" && wasPolling) {
            wasPolling = false;
            refetchActiveOperationalSnapshot(qc, { onlyActive: true });
          }
          setConnectionStatus(next);
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
          rtConnectedRef.current = false;
          setConnectionStatus("polling");
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
        rtConnectedRef.current = true;
        if (wasPolling) {
          wasPolling = false;
          refetchActiveOperationalSnapshot(qc, { onlyActive: true });
        }
        setConnectionStatus("connected");
      } else {
        startPollingFallback();
      }
    };

    const unsubBroadcast = subscribeGestionaleBroadcast({
      onInvalidate: (tables, _sourceTabId, entityIdByTable) => {
        if (cancelled) return;
        dispatchGestionaleAction(qc, tables, {
          source: "broadcast",
          entityIdByTable,
        });
      },
    });

    void connectRealtime();

    return () => {
      cancelled = true;
      rtConnectedRef.current = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      if (remoteSettingsNotifyTimer) clearTimeout(remoteSettingsNotifyTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      stopPollingFallback();
      unsubBroadcast();
      pendingTables.clear();
      pendingCabEvents.length = 0;
      pendingEntityIdByTable.clear();
      setConnectionStatus("idle");
      void removeActiveChannel();
    };
  }, [authReady, pathname, qc, setGestionaleStatus, setSettingsStatus, settingsModalOpen, user?.id]);

  return null;
}
