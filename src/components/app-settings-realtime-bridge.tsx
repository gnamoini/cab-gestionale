"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { isSupabasePublicEnvConfigured } from "@/lib/env/supabase-public";
import {
  dispatchLavorazioniPrefsRefresh,
  dispatchMagazzinoMasterRefresh,
  dispatchMezziListeRefresh,
} from "@/lib/sistema/cab-events";
import { shouldNotifyRemoteChange } from "@/lib/sistema/remote-change-notify";
import { shouldSuppressSettingsRemoteNotify } from "@/lib/sistema/settings-remote-notify-guard";
import {
  subscribePostgresChangesChannel,
  type PostgresChangePayload,
} from "@/lib/realtime/postgres-changes-channel";
import { emitCabSyncEvent } from "@/lib/sync/cab-sync-bus";
import { useRealtimeStatus } from "@/src/context/realtime-status-context";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { useSettingsModalOpen } from "@/src/context/settings-modal-open-context";
import { QK } from "@/src/lib/react-query/invalidate-related";
import type { AppSettingRow } from "@/src/types/supabase-tables";

function eventFingerprint(payload: PostgresChangePayload): string {
  const n = payload.new as Partial<AppSettingRow> | undefined;
  const o = payload.old as Partial<AppSettingRow> | undefined;
  if (payload.eventType === "DELETE") {
    return `DELETE:${o?.id ?? ""}:${o?.updated_at ?? ""}`;
  }
  return `${payload.eventType}:${n?.id ?? ""}:${n?.updated_at ?? ""}:${n?.updated_by ?? ""}`;
}

function isOwnWrite(
  userId: string | undefined,
  payload: PostgresChangePayload,
): boolean {
  if (!userId) return false;
  if (payload.eventType === "DELETE") {
    const o = payload.old as Partial<AppSettingRow> | undefined;
    return o?.updated_by === userId;
  }
  const n = payload.new as Partial<AppSettingRow> | undefined;
  return n?.updated_by === userId;
}

const REMOTE_SETTINGS_NOTIFY_DEBOUNCE_MS = 1200;
const REMOTE_SETTINGS_NOTIFY_COOLDOWN_MS = 10_000;

/** Invalida cache impostazioni su cambi `app_settings` da altri client. */
export function AppSettingsRealtimeBridge() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { push } = useToast();
  const pushRef = useRef(push);
  pushRef.current = push;
  const pathname = usePathname();
  const { isOpen: settingsModalOpen } = useSettingsModalOpen();
  const { setSettingsStatus } = useRealtimeStatus();
  const settingsModalOpenRef = useRef(settingsModalOpen);
  settingsModalOpenRef.current = settingsModalOpen;
  const onSettingsPageRef = useRef(false);
  onSettingsPageRef.current = pathname?.startsWith("/impostazioni") ?? false;
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  useEffect(() => {
    if (!isSupabasePublicEnvConfigured()) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let remoteNotifyTimer: ReturnType<typeof setTimeout> | null = null;
    let activeChannel: Awaited<ReturnType<typeof subscribePostgresChangesChannel>>["channel"] | null = null;
    const recentFingerprints = new Map<string, number>();
    const PRUNE_MS = 4000;

    const dispatchSideEffects = () => {
      dispatchMezziListeRefresh();
      dispatchMagazzinoMasterRefresh();
      dispatchLavorazioniPrefsRefresh();
    };

    const isSettingsEditorActive = () =>
      settingsModalOpenRef.current || onSettingsPageRef.current || shouldSuppressSettingsRemoteNotify();

    const scheduleInvalidate = () => {
      if (isSettingsEditorActive()) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        if (cancelled || isSettingsEditorActive()) return;
        void qc.invalidateQueries({ queryKey: [...QK.settings] });
        dispatchSideEffects();
        emitCabSyncEvent({ type: "settings_updated" });
      }, 400);
    };

    const scheduleRemoteSettingsNotify = () => {
      if (isSettingsEditorActive()) return;
      if (remoteNotifyTimer) return;
      remoteNotifyTimer = setTimeout(() => {
        remoteNotifyTimer = null;
        if (cancelled || isSettingsEditorActive()) return;
        const fp = "settings-remote-toast";
        if (!shouldNotifyRemoteChange(fp, REMOTE_SETTINGS_NOTIFY_COOLDOWN_MS)) return;
        pushRef.current("Un utente ha aggiornato le impostazioni", "info", 4500);
      }, REMOTE_SETTINGS_NOTIFY_DEBOUNCE_MS);
    };

    const onPayload = (payload: PostgresChangePayload) => {
      if (cancelled) return;
      if (shouldSuppressSettingsRemoteNotify()) return;
      if (isOwnWrite(userIdRef.current, payload)) return;

      const fp = eventFingerprint(payload);
      const now = Date.now();
      for (const [k, t] of recentFingerprints) {
        if (now - t > PRUNE_MS) recentFingerprints.delete(k);
      }
      if (recentFingerprints.has(fp)) return;
      recentFingerprints.set(fp, now);

      if (payload.eventType === "DELETE") {
        if (isSettingsEditorActive()) return;
        void qc.invalidateQueries({ queryKey: [...QK.settings] });
        dispatchSideEffects();
        emitCabSyncEvent({ type: "settings_updated" });
        return;
      }
      scheduleInvalidate();
      scheduleRemoteSettingsNotify();
    };

    const startPollingFallback = () => {
      if (pollTimer) return;
      setSettingsStatus("polling");
      pollTimer = setInterval(() => {
        if (cancelled) return;
        void qc.invalidateQueries({ queryKey: [...QK.settings] });
      }, 60_000);
    };

    const stopPollingFallback = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    void (async () => {
      const sb = getBrowserSupabase();
      const { channel, subscribed } = await subscribePostgresChangesChannel(sb, {
        channelName: "cab-app-settings-rt",
        tables: [{ table: "app_settings" }],
        onPayload: (_table, payload) => onPayload(payload),
        logPrefix: "[app_settings rt]",
        onStatusChange: (s) => setSettingsStatus(s === "connected" ? "connected" : "polling"),
        onPollingFallback: () => {
          if (!cancelled) {
            console.warn("[app_settings rt] subscription non disponibile: fallback polling 60s");
            startPollingFallback();
          }
        },
      });

      if (subscribed) {
        activeChannel = channel;
        stopPollingFallback();
        setSettingsStatus("connected");
      } else if (!cancelled) {
        startPollingFallback();
      }
    })();

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      if (remoteNotifyTimer) clearTimeout(remoteNotifyTimer);
      stopPollingFallback();
      setSettingsStatus("idle");
      const sb = getBrowserSupabase();
      if (activeChannel) {
        void sb.removeChannel(activeChannel);
        activeChannel = null;
      }
    };
  }, [qc, setSettingsStatus, user?.id]);

  return null;
}
