"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export type PostgresChangePayload = {
  eventType: string;
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
};

export type PostgresChangesTableSpec = {
  table: string;
  schema?: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
};

export type PostgresChangesChannelOptions = {
  channelName: string;
  tables: PostgresChangesTableSpec[];
  onPayload: (table: string, payload: PostgresChangePayload) => void;
  retryAttempts?: number;
  subscribeTimeoutMs?: number;
  onStatusChange?: (status: "connected" | "polling") => void;
  onPollingFallback?: () => void;
  logPrefix?: string;
};

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function postgresChangeFingerprint(
  table: string,
  payload: PostgresChangePayload,
): string {
  const n = payload.new;
  const o = payload.old;
  const id = (n?.id ?? o?.id ?? "") as string;
  const ts = (n?.updated_at ?? n?.created_at ?? o?.updated_at ?? o?.created_at ?? "") as string;
  return `${table}:${payload.eventType}:${id}:${ts}`;
}

export type PostgresChangesChannelHandle = {
  stop: () => void;
};

/**
 * Subscription postgres_changes con retry e timeout.
 * Restituisce handle per cleanup; il chiamante gestisce polling fallback se subscribe fallisce.
 */
export async function subscribePostgresChangesChannel(
  sb: SupabaseClient,
  options: PostgresChangesChannelOptions,
): Promise<{ channel: RealtimeChannel; subscribed: boolean }> {
  const {
    channelName,
    tables,
    onPayload,
    retryAttempts = 3,
    subscribeTimeoutMs = 8000,
    logPrefix = "[postgres_changes]",
  } = options;

  for (let attempt = 0; attempt < retryAttempts; attempt++) {
    const name = `${channelName}-${attempt}-${Date.now()}`;
    let channel = sb.channel(name);

    for (const spec of tables) {
      channel = channel.on(
        "postgres_changes",
        {
          event: spec.event ?? "*",
          schema: spec.schema ?? "public",
          table: spec.table,
        },
        (payload) =>
          onPayload(spec.table, payload as PostgresChangePayload),
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
            console.warn(`${logPrefix} subscribe:`, st, err?.message ?? "");
            resolve(false);
          }
        });
      }),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), subscribeTimeoutMs);
      }),
    ]);

    if (subscribed) {
      options.onStatusChange?.("connected");
      return { channel, subscribed: true };
    }

    try {
      await sb.removeChannel(channel);
    } catch {
      /* ignore */
    }
    await delay(1000 * 2 ** attempt);
  }

  options.onStatusChange?.("polling");
  options.onPollingFallback?.();
  return { channel: sb.channel(`${channelName}-failed`), subscribed: false };
}
