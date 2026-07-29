import type { AnalyzeTracePhase } from "@/lib/document-capture/pipeline/analyze-trace-types";

export type CaptureAnalyzeStreamPhaseEvent = {
  type: "phase";
  phase: AnalyzeTracePhase;
  outcome: "ok" | "fail" | "skip";
  elapsedMs: number;
  label?: string;
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
};

export type CaptureAnalyzeStreamEvent =
  | CaptureAnalyzeStreamPhaseEvent
  | CaptureAnalyzeStreamHeartbeatEvent
  | CaptureAnalyzeStreamResultEvent;

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
