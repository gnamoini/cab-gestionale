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
import { shouldSuppressSettingsRemoteNotify } from "@/lib/sistema/settings-remote-notify-guard";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { useSettingsModalOpen } from "@/src/context/settings-modal-open-context";
import { QK } from "@/src/lib/react-query/invalidate-related";
import type { AppSettingRow } from "@/src/types/supabase-tables";

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function eventFingerprint(payload: {
  eventType: string;
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
}): string {
  const n = payload.new as Partial<AppSettingRow> | undefined;
  const o = payload.old as Partial<AppSettingRow> | undefined;
  if (payload.eventType === "DELETE") {
    return `DELETE:${o?.id ?? ""}:${o?.updated_at ?? ""}`;
  }
  return `${payload.eventType}:${n?.id ?? ""}:${n?.updated_at ?? ""}:${n?.updated_by ?? ""}`;
}

function isOwnWrite(
  userId: string | undefined,
  payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> },
): boolean {
  if (!userId) return false;
  if (payload.eventType === "DELETE") {
    const o = payload.old as Partial<AppSettingRow> | undefined;
    return o?.updated_by === userId;
  }
  const n = payload.new as Partial<AppSettingRow> | undefined;
  return n?.updated_by === userId;
}

/** Invalida cache impostazioni su cambi `app_settings` da altri client; anti-loop, retry subscription, fallback polling. */
const REMOTE_SETTINGS_NOTIFY_DEBOUNCE_MS = 1500;

export function AppSettingsRealtimeBridge() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { push } = useToast();
  const pushRef = useRef(push);
  pushRef.current = push;
  const pathname = usePathname();
  const { isOpen: settingsModalOpen } = useSettingsModalOpen();
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
    let activeChannel: ReturnType<ReturnType<typeof getBrowserSupabase>["channel"]> | null = null;
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
      }, 400);
    };

    const scheduleRemoteSettingsNotify = () => {
      if (isSettingsEditorActive()) return;
      if (remoteNotifyTimer) clearTimeout(remoteNotifyTimer);
      remoteNotifyTimer = setTimeout(() => {
        remoteNotifyTimer = null;
        if (cancelled || isSettingsEditorActive()) return;
        pushRef.current("Un utente ha aggiornato le impostazioni", "info", 4500);
      }, REMOTE_SETTINGS_NOTIFY_DEBOUNCE_MS);
    };

    const onPayload = (payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
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
        return;
      }
      scheduleInvalidate();
      scheduleRemoteSettingsNotify();
    };

    const startPollingFallback = () => {
      if (pollTimer) return;
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
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        const channelName = `cab-app-settings-rt-${attempt}-${Date.now()}`;
        const channel = sb
          .channel(channelName)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "app_settings" },
            (payload) => onPayload(payload as { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }),
          );

    const subscribed = await Promise.race([
      new Promise<boolean>((resolve) => {
        channel.subscribe((status, err) => {
          if (status === "SUBSCRIBED") {
            resolve(true);
            return;
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            console.warn("[app_settings rt] subscribe:", status, err?.message ?? "");
            resolve(false);
          }
        });
      }),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 8000);
      }),
    ]);

        if (subscribed) {
          activeChannel = channel;
          stopPollingFallback();
          return;
        }
        try {
          await sb.removeChannel(channel);
        } catch {
          /* ignore */
        }
        await delay(1000 * 2 ** attempt);
      }
      if (!cancelled) {
        console.warn("[app_settings rt] subscription non disponibile: fallback polling 60s");
        startPollingFallback();
      }
    })();

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      if (remoteNotifyTimer) clearTimeout(remoteNotifyTimer);
      stopPollingFallback();
      const sb = getBrowserSupabase();
      if (activeChannel) {
        void sb.removeChannel(activeChannel);
        activeChannel = null;
      }
    };
  }, [qc, user?.id]);

  return null;
}
