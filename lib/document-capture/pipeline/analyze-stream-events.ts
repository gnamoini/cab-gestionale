import type { CapturePipelineTerminalState } from "@/lib/document-capture/orchestrator/pipeline-types";
import type { AnalyzeTracePhase } from "@/lib/document-capture/pipeline/analyze-trace-types";

export type CaptureAnalyzeStreamExecutionMeta = {
  captureId: string;
  pipelineVersion: string;
  executionId: string;
  traceId?: string;
  correlationId?: string;
};

export type CaptureAnalyzeStreamPhaseEvent = {
  type: "phase";
  phase: AnalyzeTracePhase;
  outcome: "ok" | "fail" | "skip";
  elapsedMs: number;
  label?: string;
  execution?: CaptureAnalyzeStreamExecutionMeta;
};

export type CaptureAnalyzeStreamHeartbeatEvent = {
  type: "heartbeat";
  timestamp: string;
  activePhase: AnalyzeTracePhase;
  elapsedMs: number;
  label?: string;
};

export type CaptureAnalyzeStreamResultEvent = {
  type: "result";
  ok: boolean;
  body: Record<string, unknown>;
  execution?: CaptureAnalyzeStreamExecutionMeta;
};

export type CaptureAnalyzeStreamTerminalEvent = {
  type: "terminal";
  terminalState: CapturePipelineTerminalState;
  execution: CaptureAnalyzeStreamExecutionMeta;
  code?: string;
  message?: string;
  elapsedMs: number;
};

export type CaptureAnalyzeStreamEvent =
  | CaptureAnalyzeStreamPhaseEvent
  | CaptureAnalyzeStreamHeartbeatEvent
  | CaptureAnalyzeStreamResultEvent
  | CaptureAnalyzeStreamTerminalEvent;

export const CAPTURE_ANALYZE_NDJSON_ACCEPT = "application/x-ndjson";

export function parseCaptureAnalyzeNdjsonLine(line: string): CaptureAnalyzeStreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as CaptureAnalyzeStreamEvent;
    if (!parsed || typeof parsed !== "object" || !("type" in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
