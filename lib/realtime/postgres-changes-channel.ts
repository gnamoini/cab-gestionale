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

// #region agent log
function debugRtLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
): void {
  fetch("http://127.0.0.1:7662/ingest/191e4801-c810-4957-b192-301c6ab4b769", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e701ad" },
    body: JSON.stringify({
      sessionId: "e701ad",
      location,
      message,
      data,
      hypothesisId,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
// #endregion

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

  // #region agent log
  debugRtLog(
    "postgres-changes-channel.ts:buildPostgresChangesChannel",
    "listeners attached before subscribe",
    { channelName, listenerCount: tables.length },
    "H1",
  );
  // #endregion

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

  const settle = (result: boolean): boolean => {
    if (settled) return result;
    settled = true;
    return result;
  };

  // #region agent log
  debugRtLog(
    "postgres-changes-channel.ts:subscribeRealtimeChannelOnly",
    "subscribe() invoked",
    { channelName },
    "H1",
  );
  // #endregion

  return Promise.race([
    new Promise<boolean>((resolve) => {
      channel.subscribe((st, err) => {
        if (settled && !subscribedOnce) return;

        if (st === "SUBSCRIBED") {
          subscribedOnce = true;
          // #region agent log
          debugRtLog(
            "postgres-changes-channel.ts:subscribeRealtimeChannelOnly",
            "SUBSCRIBED",
            { channelName },
            "H1",
          );
          // #endregion
          resolve(settle(true));
          return;
        }
        if (st === "CHANNEL_ERROR" || st === "TIMED_OUT" || st === "CLOSED") {
          if (subscribedOnce) {
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
        // #region agent log
        debugRtLog(
          "postgres-changes-channel.ts:subscribeRealtimeChannelOnly",
          "subscribe timeout",
          { channelName, subscribeTimeoutMs },
          "H5",
        );
        // #endregion
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

    // #region agent log
    debugRtLog(
      "postgres-changes-channel.ts:subscribePostgresChangesChannel",
      "attempt start",
      { baseName: channelName, uniqueName, attempt },
      "H2",
    );
    // #endregion

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
      // #region agent log
      debugRtLog(
        "postgres-changes-channel.ts:subscribePostgresChangesChannel",
        "attempt cleanup removeChannel",
        { uniqueName, attempt },
        "H4",
      );
      // #endregion
    } catch {
      /* ignore */
    }
    await delay(1000 * 2 ** attempt);
  }

  options.onStatusChange?.("polling");
  options.onPollingFallback?.();
  return { channel: null, subscribed: false };
}
