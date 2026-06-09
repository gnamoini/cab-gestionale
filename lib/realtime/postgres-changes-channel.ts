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
  /** Chiamato se il canale si disconnette dopo subscribe riuscito. */
  onChannelLost?: () => void;
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

/**
 * Registra tutti i listener postgres_changes su un canale NUOVO.
 * Vietato chiamare dopo subscribe() sullo stesso canale.
 */
export function buildPostgresChangesChannel(
  sb: SupabaseClient,
  options: Pick<PostgresChangesChannelOptions, "channelName" | "tables" | "onPayload">,
): RealtimeChannel {
  const { channelName, tables, onPayload } = options;
  if (tables.length === 0) {
    throw new Error("[postgres_changes] almeno una tabella richiesta");
  }

  let channel = sb.channel(channelName);
  for (const spec of tables) {
    channel = channel.on(
      "postgres_changes",
      {
        event: spec.event ?? "*",
        schema: spec.schema ?? "public",
        table: spec.table,
      },
      (payload) => {
        onPayload(spec.table, payload as PostgresChangePayload);
      },
    );
  }

  return channel;
}

type SubscribeChannelOnlyOptions = Pick<
  PostgresChangesChannelOptions,
  "subscribeTimeoutMs" | "onStatusChange" | "onChannelLost" | "logPrefix"
>;

/**
 * Avvia subscribe su un canale già configurato con tutti i .on().
 * Non aggiunge mai listener postgres_changes.
 */
export function subscribeRealtimeChannelOnly(
  channel: RealtimeChannel,
  channelName: string,
  options: SubscribeChannelOnlyOptions,
): Promise<boolean> {
  const { subscribeTimeoutMs = 8000, logPrefix = "[postgres_changes]" } = options;
  let subscribedOnce = false;
  let settled = false;
  let channelLostHandled = false;

  const settle = (result: boolean): boolean => {
    if (settled) return result;
    settled = true;
    return result;
  };

  return Promise.race([
    new Promise<boolean>((resolve) => {
      channel.subscribe((st, err) => {
        if (settled && !subscribedOnce) return;

        if (st === "SUBSCRIBED") {
          subscribedOnce = true;
          resolve(settle(true));
          return;
        }
        if (st === "CHANNEL_ERROR" || st === "TIMED_OUT" || st === "CLOSED") {
          if (subscribedOnce) {
            if (channelLostHandled) return;
            channelLostHandled = true;
            console.warn(`${logPrefix} channel lost:`, st, err?.message ?? "");
            options.onChannelLost?.();
            return;
          }
          console.warn(`${logPrefix} subscribe:`, st, err?.message ?? "");
          resolve(settle(false));
        }
      });
    }),
    new Promise<boolean>((resolve) => {
      setTimeout(() => {
        resolve(settle(false));
      }, subscribeTimeoutMs);
    }),
  ]);
}

/**
 * Subscription postgres_changes con retry e timeout.
 * Ogni tentativo: nuovo channel → tutti i .on() → subscribe() → mai .on() dopo subscribe.
 */
export async function subscribePostgresChangesChannel(
  sb: SupabaseClient,
  options: PostgresChangesChannelOptions,
): Promise<{ channel: RealtimeChannel | null; subscribed: boolean }> {
  const {
    channelName,
    tables,
    onPayload,
    retryAttempts = 3,
    subscribeTimeoutMs = 8000,
    logPrefix = "[postgres_changes]",
  } = options;

  for (let attempt = 0; attempt < retryAttempts; attempt++) {
    const uniqueName = `${channelName}-${attempt}-${Date.now()}`;

    const channel = buildPostgresChangesChannel(sb, {
      channelName: uniqueName,
      tables,
      onPayload,
    });

    const subscribed = await subscribeRealtimeChannelOnly(channel, uniqueName, {
      subscribeTimeoutMs,
      logPrefix,
      onChannelLost: options.onChannelLost,
    });

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
  return { channel: null, subscribed: false };
}
