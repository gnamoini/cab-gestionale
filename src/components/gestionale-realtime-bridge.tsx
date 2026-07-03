"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { useToastContext } from "@/context/toast-context";
import { isSupabasePublicEnvConfigured } from "@/lib/env/supabase-public";
import {
  notePollingFallbackActivation,
  noteRealtimeReconnect,
} from "@/lib/observability/degradation-detector";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import {
  appSettingsChangeFingerprint,
  isOperatorGlobalSettingsPilotPayload,
  isOwnAppSettingsWrite,
  REMOTE_SETTINGS_NOTIFY_DEBOUNCE_MS,
  shouldShowRemoteSettingsToast,
} from "@/lib/realtime/app-settings-realtime-handlers";
import {
  GESTIONALE_REALTIME_DEBOUNCE_MS,
  GESTIONALE_REALTIME_POLL_MS,
  GESTIONALE_REALTIME_RETRY_ATTEMPTS,
  GESTIONALE_REALTIME_TABLES,
} from "@/lib/realtime/gestionale-realtime-config";
import { isGestionaleForcePollEnabled } from "@/lib/realtime/gestionale-force-poll";
import { setGestionaleRealtimeRuntimeMode } from "@/lib/realtime/gestionale-realtime-runtime";
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
import { SyncTransportController } from "@/src/lib/runtime/sync/sync-transport-controller";
import { invalidateRbacTruthClient } from "@/src/lib/rbac/invalidate-rbac-truth";
import { onUserRoleChangedClient } from "@/src/lib/rbac/on-user-role-changed.client";
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
  const { user, status, refresh } = useAuth();
  const { push } = useToastContext();
  const pushRef = useRef(push);

  useEffect(() => {
    pushRef.current = push;
  }, [push]);
  const pathname = usePathname();
  const { isOpen: settingsModalOpen } = useSettingsModalOpen();
  const { setGestionaleStatus, setSettingsStatus } = useRealtimeStatus();
  const authReady = isAuthSessionEstablished(status) && !!user?.id;
  const rtConnectedRef = useRef(false);
  const settingsModalOpenRef = useRef(settingsModalOpen);
  const onSettingsPageRef = useRef(false);
  const userIdRef = useRef(user?.id);

  useEffect(() => {
    settingsModalOpenRef.current = settingsModalOpen;
  }, [settingsModalOpen]);

  useEffect(() => {
    onSettingsPageRef.current = pathname?.startsWith("/impostazioni") ?? false;
  }, [pathname]);

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  useEffect(() => {
    if (!authReady || !isSupabasePublicEnvConfigured()) return;

    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let remoteSettingsNotifyTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let activeChannel: Awaited<ReturnType<typeof subscribePostgresChangesChannel>>["channel"] | null = null;
    let reconnecting = false;
    let reconnectAttempts = 0;
    let reconnectExhausted = false;
    let wasPolling = false;
    let connectGeneration = 0;

    const transport = new SyncTransportController({
      pollIntervalMs: GESTIONALE_REALTIME_POLL_MS,
      onPoll: () => {
        if (cancelled) return;
        if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
        refetchActiveOperationalSnapshot(qc, { onlyActive: true });
      },
      onModeChange: (mode) => {
        const next = mode === "realtime" ? "connected" : mode === "polling" ? "polling" : "idle";
        setConnectionStatus(next);
      },
    });
    const pendingTables = new Set<string>();
    const pendingCabEvents: ReturnType<typeof cabSyncEventFromPostgresChange>[] = [];
    const pendingEntityIdsByTable = new Map<string, Set<string>>();
    const recentFingerprints = new Map<string, number>();
    const PRUNE_MS = 5000;

    const setConnectionStatus = (next: "connected" | "polling" | "idle") => {
      setGestionaleStatus(next);
      setSettingsStatus(next);
      setGestionaleRealtimeRuntimeMode(next);
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
        pushRef.current("Impostazioni aggiornate da un altro utente", "info", 4500);
      }, REMOTE_SETTINGS_NOTIFY_DEBOUNCE_MS);
    };

    const startPollingFallback = (reason?: string) => {
      wasPolling = true;
      rtConnectedRef.current = false;
      transport.activatePolling(reason);
    };

    const stopPollingFallback = () => {
      transport.stopPolling();
    };

    const flushInvalidations = () => {
      if (cancelled || pendingTables.size === 0) return;
      const tables = [...pendingTables];
      const tableCount = tables.length;
      const cabEvents = pendingCabEvents.filter((e): e is NonNullable<typeof e> => e != null);
      pendingTables.clear();
      pendingCabEvents.length = 0;

      const entityIdByTable = new Map<string, string>();
      for (const [table, ids] of pendingEntityIdsByTable) {
        if (ids.size === 1) {
          entityIdByTable.set(table, [...ids][0]!);
        }
      }
      pendingEntityIdsByTable.clear();

      dispatchGestionaleAction(qc, tables, {
        source: "realtime",
        cabSyncEvents: cabEvents,
        entityIdByTable,
      });

      if (tableCount >= 5) {
        trackRuntimeEvent(RuntimeEvents.realtimeBurst, { tableCount, tables: tables.slice(0, 8) });
      } else {
        trackRuntimeEvent(RuntimeEvents.realtimeFlush, { tableCount });
      }
    };

    const scheduleInvalidate = (table: string, cabEvent?: ReturnType<typeof cabSyncEventFromPostgresChange>) => {
      pendingTables.add(table);
      if (cabEvent) {
        pendingCabEvents.push(cabEvent);
        if (cabEvent.type !== "settings_updated" && cabEvent.table && cabEvent.id) {
          let ids = pendingEntityIdsByTable.get(cabEvent.table);
          if (!ids) {
            ids = new Set();
            pendingEntityIdsByTable.set(cabEvent.table, ids);
          }
          ids.add(cabEvent.id);
        }
      }
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        flushInvalidations();
      }, GESTIONALE_REALTIME_DEBOUNCE_MS);
    };

    const onAuthCriticalChange = (table: string, payload?: PostgresChangePayload) => {
      if (table === "app_settings") {
        if (payload && !isOperatorGlobalSettingsPilotPayload(payload)) return;
        void invalidateRbacTruthClient({
          reason: "pilotChanged",
          queryClient: qc,
        });
      } else if (table === "user_permissions") {
        void invalidateRbacTruthClient({
          reason: "roleOrPermissionsChanged",
          queryClient: qc,
          currentUserId: userIdRef.current,
          refreshAuth: refresh,
        });
      } else if (table === "profiles") {
        const newRoleKey = payload?.new?.role_key;
        const oldRoleKey = payload?.old?.role_key;
        const rowId = payload?.new?.id ?? payload?.old?.id;
        if (rowId === userIdRef.current && newRoleKey !== oldRoleKey) {
          void onUserRoleChangedClient(String(rowId), {
            currentUserId: userIdRef.current ?? undefined,
            refresh,
            queryClient: qc,
          });
        } else {
          void invalidateRbacTruthClient({
            reason: "roleOrPermissionsChanged",
            queryClient: qc,
          });
        }
      }
    };

    const onPayload = (table: string, payload: PostgresChangePayload) => {
      if (cancelled) return;
      if (!transport.shouldProcessRealtimePayload()) return;

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
        onAuthCriticalChange(table, payload);
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
      if (table === "user_permissions" || table === "profiles") {
        onAuthCriticalChange(table);
      }
    };

    const removeActiveChannel = async (reason: string) => {
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
      if (cancelled || reconnecting || reconnectExhausted) return;
      if (isGestionaleForcePollEnabled()) {
        startPollingFallback("NEXT_PUBLIC_GESTIONALE_FORCE_POLL");
        reconnecting = false;
        return;
      }
      reconnecting = true;
      const gen = ++connectGeneration;

      await removeActiveChannel("pre-connect");
      if (cancelled || gen !== connectGeneration) {
        reconnecting = false;
        return;
      }

      const sb = getBrowserSupabase();
      const tables = GESTIONALE_REALTIME_TABLES.map((s) => ({ table: s.table }));
      const channelName = `cab-gestionale-rt-${gen}`;

      try {
        const { channel, subscribed } = await subscribePostgresChangesChannel(sb, {
          channelName,
          tables,
          onPayload,
          retryAttempts: GESTIONALE_REALTIME_RETRY_ATTEMPTS,
          logPrefix: "[gestionale rt]",
          onStatusChange: (s) => {
            if (cancelled) return;
            if (s === "connected") {
              rtConnectedRef.current = true;
              reconnectExhausted = false;
              transport.activateRealtime();
              if (wasPolling) {
                wasPolling = false;
                refetchActiveOperationalSnapshot(qc, { onlyActive: true });
              }
            } else if (transport.getMode() !== "polling") {
              rtConnectedRef.current = false;
              startPollingFallback("channel not connected");
            }
          },
          onPollingFallback: () => {
            if (!cancelled) {
              startPollingFallback(`subscription unavailable (${GESTIONALE_REALTIME_POLL_MS}ms)`);
            }
          },
          onChannelLost: () => {
            if (cancelled || reconnectExhausted) return;
            rtConnectedRef.current = false;
            startPollingFallback("channel lost");
            void removeActiveChannel("channel-lost").then(() => {
              if (cancelled || reconnectExhausted) return;
              if (reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
                reconnectExhausted = true;
                notePollingFallbackActivation("max reconnect attempts — polling fallback");
                startPollingFallback("max reconnect attempts");
                return;
              }
              reconnectAttempts += 1;
              trackRuntimeEvent(RuntimeEvents.realtimeReconnect, { attempt: reconnectAttempts });
              noteRealtimeReconnect(reconnectAttempts);
              const backoff = Math.min(1000 * 2 ** reconnectAttempts, 30_000);
              reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                reconnecting = false;
                void connectRealtime();
              }, backoff);
            });
          },
        });

        if (cancelled || gen !== connectGeneration) {
          if (subscribed && channel) await sb.removeChannel(channel);
          return;
        }

        if (subscribed && channel) {
          activeChannel = channel;
          reconnectAttempts = 0;
          reconnectExhausted = false;
          rtConnectedRef.current = true;
          transport.activateRealtime();
          if (wasPolling) {
            wasPolling = false;
            refetchActiveOperationalSnapshot(qc, { onlyActive: true });
          }
        } else {
          startPollingFallback("subscribe failed");
        }
      } finally {
        reconnecting = false;
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
      transport.dispose();
      unsubBroadcast();
      pendingTables.clear();
      pendingCabEvents.length = 0;
      pendingEntityIdsByTable.clear();
      connectGeneration += 1;
      setConnectionStatus("idle");
      void removeActiveChannel("effect-cleanup");
    };
  }, [authReady, qc, setGestionaleStatus, setSettingsStatus, user?.id]);

  return null;
}
