/** Multi-tab coordination for notification realtime subscriber — one leader per userId. */

export const NOTIFICATION_REALTIME_BC = "cab-notifications-realtime-v1";

export type RealtimeLeaderMessage =
  | { type: "leader_claim"; userId: string; tabId: string; ts: number }
  | { type: "leader_release"; userId: string; tabId: string }
  | { type: "invalidate"; userId: string; notificationId?: string; inboxVersion: number };

export function createRealtimeTabId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export class RealtimeTabCoordinator {
  private bc: BroadcastChannel | null = null;
  private tabId: string;
  private userId: string;
  private isLeader = false;
  private onBecomeFollower: () => void;
  private onBecomeLeader: () => void;
  private onRemoteInvalidate: (inboxVersion: number) => void;
  private leaderHeartbeat: ReturnType<typeof setInterval> | null = null;

  constructor(opts: {
    userId: string;
    onBecomeLeader: () => void;
    onBecomeFollower: () => void;
    onRemoteInvalidate: (inboxVersion: number) => void;
  }) {
    this.userId = opts.userId;
    this.tabId = createRealtimeTabId();
    this.onBecomeLeader = opts.onBecomeLeader;
    this.onBecomeFollower = opts.onBecomeFollower;
    this.onRemoteInvalidate = opts.onRemoteInvalidate;
  }

  start(): void {
    if (typeof BroadcastChannel === "undefined") {
      this.isLeader = true;
      this.onBecomeLeader();
      return;
    }
    this.bc = new BroadcastChannel(NOTIFICATION_REALTIME_BC);
    this.bc.onmessage = (ev) => this.handleMessage(ev.data as RealtimeLeaderMessage);
    this.claimLeadership();
  }

  stop(): void {
    this.clearHeartbeat();
    if (this.isLeader) {
      this.broadcast({ type: "leader_release", userId: this.userId, tabId: this.tabId });
    }
    this.bc?.close();
    this.bc = null;
    this.isLeader = false;
  }

  broadcastInvalidate(notificationId: string | undefined, inboxVersion: number): void {
    this.broadcast({
      type: "invalidate",
      userId: this.userId,
      notificationId,
      inboxVersion,
    });
  }

  get leader(): boolean {
    return this.isLeader;
  }

  private broadcast(msg: RealtimeLeaderMessage): void {
    try {
      this.bc?.postMessage(msg);
    } catch {
      /* ignore */
    }
  }

  private claimLeadership(): void {
    this.broadcast({
      type: "leader_claim",
      userId: this.userId,
      tabId: this.tabId,
      ts: Date.now(),
    });
    setTimeout(() => {
      if (!this.isLeader) {
        this.isLeader = true;
        this.onBecomeLeader();
        this.startHeartbeat();
      }
    }, 50);
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.leaderHeartbeat = setInterval(() => {
      if (!this.isLeader) return;
      this.broadcast({
        type: "leader_claim",
        userId: this.userId,
        tabId: this.tabId,
        ts: Date.now(),
      });
    }, 5000);
  }

  private clearHeartbeat(): void {
    if (this.leaderHeartbeat) clearInterval(this.leaderHeartbeat);
    this.leaderHeartbeat = null;
  }

  private handleMessage(msg: RealtimeLeaderMessage): void {
    if (!msg || msg.userId !== this.userId) return;
    if (msg.type === "leader_claim") {
      if (msg.tabId !== this.tabId && this.isLeader) {
        if (msg.ts >= Date.now() - 100) {
          this.isLeader = false;
          this.clearHeartbeat();
          this.onBecomeFollower();
        }
      } else if (msg.tabId !== this.tabId && !this.isLeader) {
        /* follower — ignore */
      }
      return;
    }
    if (msg.type === "leader_release" && msg.tabId !== this.tabId && !this.isLeader) {
      this.claimLeadership();
      return;
    }
    if (msg.type === "invalidate" && !this.isLeader) {
      this.onRemoteInvalidate(msg.inboxVersion);
    }
  }
}
