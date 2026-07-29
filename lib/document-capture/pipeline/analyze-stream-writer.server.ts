import "server-only";

import type { AnalyzeTraceListener } from "@/lib/document-capture/pipeline/analyze-trace.server";
import type { AnalyzeTracePhase } from "@/lib/document-capture/pipeline/analyze-trace-types";
import { captureAnalyzePhaseLabel } from "@/lib/document-capture/pipeline/analyze-progress-labels";
import type { CaptureAnalyzeStreamEvent } from "@/lib/document-capture/pipeline/analyze-stream-events";

const HEARTBEAT_MS = 8_000;

export function createAnalyzeStreamListener(
  onEvent: (event: CaptureAnalyzeStreamEvent) => void,
): { listener: AnalyzeTraceListener; stopHeartbeat: () => void } {
  let activePhase: AnalyzeTracePhase = "START";
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const emitHeartbeat = () => {
    onEvent({
      type: "heartbeat",
      timestamp: new Date().toISOString(),
      activePhase,
      elapsedMs: 0,
      label: captureAnalyzePhaseLabel(activePhase),
    });
  };

  const startHeartbeat = () => {
    if (heartbeatTimer) return;
    heartbeatTimer = setInterval(emitHeartbeat, HEARTBEAT_MS);
  };

  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const listener: AnalyzeTraceListener = (phase, outcome, meta) => {
    activePhase = phase;
    onEvent({
      type: "phase",
      phase,
      outcome,
      elapsedMs: meta.elapsedMs,
      label: captureAnalyzePhaseLabel(phase),
    });
    if (phase === "GEMINI_REQUEST" || phase === "HYBRID_START") {
      startHeartbeat();
    }
    if (phase === "GEMINI_RESPONSE" || phase === "HYBRID_OK" || phase === "HYBRID_SKIP" || phase === "END_OK") {
      stopHeartbeat();
    }
  };

  return { listener, stopHeartbeat };
}

export function encodeAnalyzeNdjsonLine(event: CaptureAnalyzeStreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}
