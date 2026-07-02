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

export type InboxChannelStatus = "live" | "degraded" | "off";

type CoordinatorOptions = {
  userId: string;
  queryClient: QueryClient;
  drawerOpen: boolean;
};

export class RealtimeInboxCoordinator {
  private userId: string;
  private queryClient: QueryClient;
  private drawerOpen = false;
  private seenIds = new Map<string, number>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private invalidateMutex = false;
  private channel: ReturnType<Awaited<ReturnType<typeof getBrowserSupabase>>["channel"]> | null = null;
  private resubscribeAttempt = 0;
  private resubscribeTimer: ReturnType<typeof setTimeout> | null = null;
  private subscribeGeneration = 0;
  private status: InboxChannelStatus = "off";

  constructor(opts: CoordinatorOptions) {
    this.userId = opts.userId;
    this.queryClient = opts.queryClient;
    this.drawerOpen = opts.drawerOpen;
  }

  get channelStatus(): InboxChannelStatus {
    return this.status;
  }

  setDrawerOpen(open: boolean): void {
    this.drawerOpen = open;
    this.syncPolling();
  }

  async start(): Promise<void> {
    await this.subscribe();
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
    this.clearResubscribe();
    void this.teardownChannel();
    this.status = "off";
  }

  private onVisibilityChange = (): void => {
    if (document.visibilityState === "visible") {
      void this.invalidateInbox();
    }
  };

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
      await Promise.all([
        this.queryClient.invalidateQueries({ queryKey: [...QK.notificationsInbox, this.userId] }),
        this.queryClient.invalidateQueries({ queryKey: [...QK.notificationsUnread, this.userId] }),
      ]);
    } finally {
      this.invalidateMutex = false;
    }
  }

  private onInsert = (payload: { new?: { id?: string } }): void => {
    const id = payload.new?.id;
    if (!id) return;
    this.pruneSeen();
    if (this.seenIds.has(id)) return;
    this.seenIds.set(id, Date.now());
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
      this.clearPoll();
      void this.invalidateInbox();
      return;
    }

    this.status = "degraded";
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
