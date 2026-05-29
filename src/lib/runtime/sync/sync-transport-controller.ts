import { notePollingFallbackActivation } from "@/lib/observability/degradation-detector";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";

export type SyncTransportMode = "realtime" | "polling" | "idle";

export type SyncTransportControllerOptions = {
  pollIntervalMs: number;
  onPoll: () => void;
  onModeChange?: (mode: SyncTransportMode) => void;
};

/**
 * Transporte sync mutuamente esclusivo: realtime XOR polling (mai entrambi attivi).
 */
export class SyncTransportController {
  private mode: SyncTransportMode = "idle";
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private acceptRealtimePayloads = true;

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
    this.pollTimer = setInterval(() => {
      this.opts.onPoll();
    }, this.opts.pollIntervalMs);
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  setIdle(): void {
    this.stopPolling();
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
