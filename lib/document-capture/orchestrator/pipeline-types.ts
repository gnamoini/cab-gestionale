import type { PipelinePhase } from "@/lib/document-capture/orchestrator/pipeline-orchestrator";
import type { CapturePipelineVersion } from "@/lib/document-capture/orchestrator/capture-pipeline-version";

export type CapturePipelineTerminalState = "completed" | "failed" | "cancelled";

export type CapturePipelineExecutionContext = {
  captureId: string;
  pipelineVersion: CapturePipelineVersion | string;
  executionId: string;
  correlationId?: string;
  traceId: string;
  userId: string;
  startedAt: number;
};

export type CapturePipelinePhaseRank = {
  phase: PipelinePhase | "verify";
  rank: number;
};

/** Monotonic phase ordering for invariant checks. */
export const CAPTURE_PIPELINE_PHASE_RANKS: Record<PipelinePhase | "verify", number> = {
  verify: 1,
  physical_parse: 2,
  ai_extract: 3,
  project: 4,
  validate: 5,
  interpret: 6,
  detect_duplicates: 7,
  plan_apply: 8,
};

export function capturePipelinePhaseRank(phase: PipelinePhase | "verify"): number {
  return CAPTURE_PIPELINE_PHASE_RANKS[phase] ?? 0;
}
