import type { AnalyzeTraceEventPayload } from "@/lib/document-capture/pipeline/analyze-trace.server";
import type { AnalyzeTraceOutcome, AnalyzeTracePhase } from "@/lib/document-capture/pipeline/analyze-trace-types";

export type AnalyzeTraceEmitter = {
  emit(phase: AnalyzeTracePhase, outcome: AnalyzeTraceOutcome, payload?: AnalyzeTraceEventPayload): void;
};
