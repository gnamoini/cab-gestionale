import { notePollingFallbackActivation } from "@/lib/observability/degradation-detector";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";

export type SyncTransportMode = "realtime" | "polling" | "idle";

export type SyncTransportControllerOptions = {
  pollIntervalMs: number;
  onPoll: () => void;
  onModeChange?: (mode: SyncTransportMode) => void;
};

const POLL_BACKOFF_AFTER_MS = 5 * 60_000;
const POLL_INTERVAL_MAX_MS = 60_000;

/**
 * Transporte sync mutuamente esclusivo: realtime XOR polling (mai entrambi attivi).
 * Polling: backoff esponenziale dopo 5 minuti in fallback (20s → 40s → 60s cap).
 */
export class SyncTransportController {
  private mode: SyncTransportMode = "idle";
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private acceptRealtimePayloads = true;
  private pollingStartedAt = 0;
  private pollIntervalCurrent = 0;
  private pollBackoffLevel = 0;

  constructor(private readonly opts: SyncTransportControllerOptions) {}

  getMode(): SyncTransportMode {
    return this.mode;
  }

  isPollingActive(): boolean {
    return this.pollTimer != null;
  }

  shouldProcessRealtimePayload(): boolean {
    return this.acceptRealtimePayloads && this.mode === "realtime";
  }

  activateRealtime(): void {
    this.stopPolling();
    this.pollBackoffLevel = 0;
    this.pollIntervalCurrent = 0;
    this.acceptRealtimePayloads = true;
    this.setMode("realtime");
  }

  activatePolling(reason?: string): void {
    if (this.pollTimer) return;
    this.acceptRealtimePayloads = false;
    this.setMode("polling");
    notePollingFallbackActivation(reason);
    trackRuntimeEvent(RuntimeEvents.realtimePollingFallback, {
      reason: reason?.slice(0, 200) ?? "unknown",
    });
    if (reason) {
      trackRuntimeEvent(RuntimeEvents.realtimeFlush, { mode: "polling", reason: reason.slice(0, 200) });
    }
    this.pollingStartedAt = Date.now();
    this.pollBackoffLevel = 0;
    this.pollIntervalCurrent = this.opts.pollIntervalMs;
    this.scheduleNextPoll();
  }

  private maybeIncreasePollBackoff(): void {
    const elapsed = Date.now() - this.pollingStartedAt;
    if (elapsed < POLL_BACKOFF_AFTER_MS) return;
    const doubled = this.opts.pollIntervalMs * 2 ** Math.min(this.pollBackoffLevel + 1, 2);
    const next = Math.min(POLL_INTERVAL_MAX_MS, doubled);
    if (next > this.pollIntervalCurrent) {
      this.pollBackoffLevel += 1;
      this.pollIntervalCurrent = next;
    }
  }

  private scheduleNextPoll(): void {
    this.stopPolling();
    this.pollTimer = setTimeout(() => {
      this.pollTimer = null;
      this.opts.onPoll();
      this.maybeIncreasePollBackoff();
      if (this.mode === "polling") {
        this.scheduleNextPoll();
      }
    }, this.pollIntervalCurrent);
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  setIdle(): void {
    this.stopPolling();
    this.pollBackoffLevel = 0;
    this.pollIntervalCurrent = 0;
    this.acceptRealtimePayloads = false;
    this.setMode("idle");
  }

  dispose(): void {
    this.setIdle();
  }

  private setMode(next: SyncTransportMode): void {
    if (this.mode === next) return;
    this.mode = next;
    this.opts.onModeChange?.(next);
  }
}
