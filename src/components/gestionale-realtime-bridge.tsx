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
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function eventFingerprint(table: string, payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }): string {
  const n = payload.new;
  const o = payload.old;
  const id = (n?.id ?? o?.id ?? "") as string;
  const ts = (n?.updated_at ?? n?.created_at ?? o?.updated_at ?? o?.created_at ?? "") as string;
  return `${table}:${payload.eventType}:${id}:${ts}`;
}

/**
 * Bridge Realtime globale: invalida cache React Query su cambi DB condivisi.
 * Fallback polling solo se la subscription Realtime non è disponibile.
 */
export function GestionaleRealtimeBridge() {
  const qc = useQueryClient();
  const { user, status } = useAuth();
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  const authReady = isAuthSessionEstablished(status) && !!user?.id;

  useEffect(() => {
    if (!authReady || !isSupabasePublicEnvConfigured()) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let activeChannel: ReturnType<ReturnType<typeof getBrowserSupabase>["channel"]> | null = null;
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
    };

    const scheduleInvalidate = (table: string) => {
      pendingTables.add(table);
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        flushInvalidations();
      }, GESTIONALE_REALTIME_DEBOUNCE_MS);
    };

    const onPayload = (table: string, payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
      if (cancelled) return;

      const fp = eventFingerprint(table, payload);
      const now = Date.now();
      for (const [k, t] of recentFingerprints) {
        if (now - t > PRUNE_MS) recentFingerprints.delete(k);
      }
      if (recentFingerprints.has(fp)) return;
      recentFingerprints.set(fp, now);

      scheduleInvalidate(table);
    };

    const startPollingFallback = () => {
      if (pollTimer) return;
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

    void (async () => {
      const sb = getBrowserSupabase();

      for (let attempt = 0; attempt < GESTIONALE_REALTIME_RETRY_ATTEMPTS && !cancelled; attempt++) {
        const channelName = `cab-gestionale-rt-${attempt}-${Date.now()}`;
        let channel = sb.channel(channelName);

        for (const spec of GESTIONALE_REALTIME_TABLES) {
          channel = channel.on(
            "postgres_changes",
            { event: "*", schema: "public", table: spec.table },
            (payload) =>
              onPayload(spec.table, payload as { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }),
          );
        }

        const subscribed = await Promise.race([
          new Promise<boolean>((resolve) => {
            channel.subscribe((st, err) => {
              if (st === "SUBSCRIBED") {
                resolve(true);
                return;
              }
              if (st === "CHANNEL_ERROR" || st === "TIMED_OUT" || st === "CLOSED") {
                console.warn("[gestionale rt] subscribe:", st, err?.message ?? "");
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
        console.warn(`[gestionale rt] subscription non disponibile: fallback polling ${GESTIONALE_REALTIME_POLL_MS}ms`);
        startPollingFallback();
      }
    })();

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      stopPollingFallback();
      pendingTables.clear();
      const sb = getBrowserSupabase();
      if (activeChannel) {
        void sb.removeChannel(activeChannel);
        activeChannel = null;
      }
    };
  }, [authReady, qc, user?.id]);

  return null;
}
