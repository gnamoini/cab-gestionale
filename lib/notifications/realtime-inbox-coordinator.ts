"use client";

import type { QueryClient } from "@tanstack/react-query";
import {
  buildPostgresChangesChannel,
  subscribeRealtimeChannelOnly,
} from "@/lib/realtime/postgres-changes-channel";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { QK } from "@/src/lib/react-query/invalidate-related";

const SEEN_TTL_MS = 5 * 60_000;
const DEBOUNCE_MS = 300;
const FALLBACK_POLL_MS = 120_000;
const FALLBACK_POLL_DRAWER_MS = 30_000;
const RESUBSCRIBE_BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30_000];
const GAP_STALE_MS = 45_000;

export type InboxChannelStatus = "live" | "degraded" | "off";

export type InboxCoordinatorHealth = {
  channelStatus: InboxChannelStatus;
  heartbeatTimestamp: number | null;
  lastEventId: string | null;
  inboxVersion: number;
};

type CoordinatorOptions = {
  userId: string;
  queryClient: QueryClient;
  drawerOpen: boolean;
  onHealthChange?: (health: InboxCoordinatorHealth) => void;
};

async function reportClientPipelineTrace(input: {
  traceId: string;
  stage: "client_received" | "realtime_emit";
  notificationId?: string;
  inboxVersion?: number;
  lastEventId?: string;
}): Promise<void> {
  try {
    await fetch("/api/notifications/pipeline-trace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    /* ponytail: client trace best-effort */
  }
}

export class RealtimeInboxCoordinator {
  private userId: string;
  private queryClient: QueryClient;
  private drawerOpen = false;
  private onHealthChange?: (health: InboxCoordinatorHealth) => void;
  private seenIds = new Map<string, number>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private gapTimer: ReturnType<typeof setInterval> | null = null;
  private invalidateMutex = false;
  private channel: ReturnType<Awaited<ReturnType<typeof getBrowserSupabase>>["channel"]> | null = null;
  private resubscribeAttempt = 0;
  private resubscribeTimer: ReturnType<typeof setTimeout> | null = null;
  private subscribeGeneration = 0;
  private status: InboxChannelStatus = "off";
  private heartbeatTimestamp: number | null = null;
  private lastEventId: string | null = null;
  private inboxVersion = 0;

  constructor(opts: CoordinatorOptions) {
    this.userId = opts.userId;
    this.queryClient = opts.queryClient;
    this.drawerOpen = opts.drawerOpen;
    this.onHealthChange = opts.onHealthChange;
  }

  get channelStatus(): InboxChannelStatus {
    return this.status;
  }

  get health(): InboxCoordinatorHealth {
    return {
      channelStatus: this.status,
      heartbeatTimestamp: this.heartbeatTimestamp,
      lastEventId: this.lastEventId,
      inboxVersion: this.inboxVersion,
    };
  }

  setDrawerOpen(open: boolean): void {
    this.drawerOpen = open;
    this.syncPolling();
  }

  async start(): Promise<void> {
    await this.subscribe();
    this.startGapWatch();
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.onVisibilityChange);
    }
  }

  stop(): void {
    this.subscribeGeneration += 1;
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
    }
    this.clearDebounce();
    this.clearPoll();
    this.clearGapWatch();
    this.clearResubscribe();
    void this.teardownChannel();
    this.status = "off";
    this.emitHealth();
  }

  private emitHealth(): void {
    this.onHealthChange?.(this.health);
  }

  private onVisibilityChange = (): void => {
    if (document.visibilityState === "visible") {
      this.resubscribeAttempt = 0;
      void this.invalidateInbox();
      if (this.status !== "live") {
        void this.subscribe();
      }
    }
  };

  private startGapWatch(): void {
    this.clearGapWatch();
    this.gapTimer = setInterval(() => {
      if (this.status !== "live" || !this.heartbeatTimestamp) return;
      if (Date.now() - this.heartbeatTimestamp > GAP_STALE_MS) {
        void this.invalidateInbox();
      }
    }, 15_000);
  }

  private clearGapWatch(): void {
    if (this.gapTimer) clearInterval(this.gapTimer);
    this.gapTimer = null;
  }

  private pruneSeen(): void {
    const now = Date.now();
    for (const [id, ts] of this.seenIds) {
      if (now - ts > SEEN_TTL_MS) this.seenIds.delete(id);
    }
  }

  private scheduleInvalidate(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.invalidateInbox();
    }, DEBOUNCE_MS);
  }

  private clearDebounce(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = null;
  }

  private clearPoll(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  private clearResubscribe(): void {
    if (this.resubscribeTimer) clearTimeout(this.resubscribeTimer);
    this.resubscribeTimer = null;
  }

  private syncPolling(): void {
    this.clearPoll();
    if (this.status !== "degraded") return;
    const ms = this.drawerOpen ? FALLBACK_POLL_DRAWER_MS : FALLBACK_POLL_MS;
    this.pollTimer = setInterval(() => void this.invalidateInbox(), ms);
  }

  private async invalidateInbox(): Promise<void> {
    if (this.invalidateMutex) return;
    this.invalidateMutex = true;
    try {
      this.inboxVersion += 1;
      this.emitHealth();
      await Promise.all([
        this.queryClient.invalidateQueries({ queryKey: [...QK.notificationsInbox, this.userId] }),
        this.queryClient.invalidateQueries({ queryKey: [...QK.notificationsUnread, this.userId] }),
      ]);
    } finally {
      this.invalidateMutex = false;
    }
  }

  private onInsert = (payload: { new?: { id?: string; source_domain_event?: string } }): void => {
    const id = payload.new?.id;
    if (!id) return;
    this.pruneSeen();
    if (this.seenIds.has(id)) return;
    this.seenIds.set(id, Date.now());
    this.heartbeatTimestamp = Date.now();
    this.lastEventId = id;
    this.inboxVersion += 1;
    this.emitHealth();
    void reportClientPipelineTrace({
      traceId: id,
      stage: "realtime_emit",
      notificationId: id,
      inboxVersion: this.inboxVersion,
      lastEventId: id,
    });
    this.scheduleInvalidate();
  };

  private scheduleResubscribe(): void {
    this.clearResubscribe();
    const delay = RESUBSCRIBE_BACKOFF_MS[Math.min(this.resubscribeAttempt, RESUBSCRIBE_BACKOFF_MS.length - 1)]!;
    this.resubscribeAttempt += 1;
    this.resubscribeTimer = setTimeout(() => void this.subscribe(), delay);
  }

  private async teardownChannel(): Promise<void> {
    const ch = this.channel;
    this.channel = null;
    if (!ch) return;
    try {
      const client = await getBrowserSupabase();
      await client.removeChannel(ch);
    } catch {
      /* ignore */
    }
  }

  private async subscribe(): Promise<void> {
    const gen = ++this.subscribeGeneration;
    await this.teardownChannel();
    if (gen !== this.subscribeGeneration) return;

    const client = await getBrowserSupabase();
    const channelName = `notifications-inbox:${this.userId}-${gen}`;
    const channel = buildPostgresChangesChannel(client, {
      channelName,
      tables: [{ table: "notifications", event: "INSERT" }],
      onPayload: (_table, payload) => this.onInsert(payload),
    });
    this.channel = channel;

    const subscribed = await subscribeRealtimeChannelOnly(channel, channelName, {
      subscribeTimeoutMs: 8000,
      logPrefix: "[notifications-inbox]",
      onChannelLost: () => {
        if (gen !== this.subscribeGeneration) return;
        this.status = "degraded";
        this.emitHealth();
        this.syncPolling();
        this.scheduleResubscribe();
      },
    });

    if (gen !== this.subscribeGeneration) {
      try {
        await client.removeChannel(channel);
      } catch {
        /* ignore */
      }
      return;
    }

    if (subscribed) {
      this.status = "live";
      this.resubscribeAttempt = 0;
      this.heartbeatTimestamp = Date.now();
      this.emitHealth();
      this.clearPoll();
      void this.invalidateInbox();
      return;
    }

    this.status = "degraded";
    this.emitHealth();
    this.syncPolling();
    try {
      await client.removeChannel(channel);
    } catch {
      /* ignore */
    }
    this.channel = null;
    this.scheduleResubscribe();
  }
}
