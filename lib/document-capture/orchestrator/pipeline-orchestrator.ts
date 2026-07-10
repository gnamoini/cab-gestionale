import type { PipelineState } from "@/lib/document-capture/model/pipeline-state";

export type PipelinePhase =
  | "physical_parse"
  | "ai_extract"
  | "project"
  | "validate"
  | "interpret"
  | "detect_duplicates"
  | "plan_apply";

export type PipelineExecutionStatus = "pending" | "running" | "completed" | "failed";

export type PipelineExecution = {
  id: string;
  captureId: string;
  phase: PipelinePhase;
  idempotencyKey: string;
  status: PipelineExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  resultRef?: string;
};

export function buildPipelineIdempotencyKey(
  phase: PipelinePhase,
  captureId: string,
  suffix?: string,
): string {
  return `${phase}:${captureId}${suffix ? `:${suffix}` : ""}`;
}

export type PipelineRunResult =
  | { ok: true; phase: PipelinePhase; reused: boolean }
  | { ok: false; phase: PipelinePhase; code: string; message: string };

export type PipelineOrchestratorDeps = {
  getPipelineState: (captureId: string) => Promise<PipelineState | null>;
  setPipelineState: (captureId: string, state: PipelineState) => Promise<void>;
  findExecution: (idempotencyKey: string) => Promise<PipelineExecution | null>;
  saveExecution: (execution: PipelineExecution) => Promise<void>;
  runPhase: (captureId: string, phase: PipelinePhase) => Promise<{ resultRef?: string }>;
};

export class PipelineCoherenceError extends Error {
  readonly code = "PIPELINE_COHERENCE" as const;
  constructor(message: string) {
    super(message);
    this.name = "PipelineCoherenceError";
  }
}

/** COH-01..04 */
export function assertPipelineCoherence(state: PipelineState, targetPhase: PipelinePhase): void {
  if (targetPhase !== "physical_parse" && state.upload !== "uploaded") {
    throw new PipelineCoherenceError(`COH-01: upload must be uploaded before ${targetPhase}`);
  }
  const needsAnalysis = ["validate", "interpret", "detect_duplicates", "plan_apply"].includes(targetPhase);
  if (needsAnalysis && state.analysis !== "completed") {
    throw new PipelineCoherenceError(`COH-02: analysis must be completed before ${targetPhase}`);
  }
  if (targetPhase === "plan_apply" && state.validation === "blocked") {
    throw new PipelineCoherenceError("COH-03: validation blocked cannot apply");
  }
}

export async function runPipelinePhase(
  deps: PipelineOrchestratorDeps,
  captureId: string,
  phase: PipelinePhase,
  idempotencySuffix?: string,
): Promise<PipelineRunResult> {
  const idempotencyKey = buildPipelineIdempotencyKey(phase, captureId, idempotencySuffix);
  const existing = await deps.findExecution(idempotencyKey);
  if (existing?.status === "completed") {
    return { ok: true, phase, reused: true };
  }

  const state = (await deps.getPipelineState(captureId)) ?? {
    upload: "pending",
    analysis: "pending",
    validation: "pending",
    apply: "pending",
  };
  assertPipelineCoherence(state, phase);

  const execution: PipelineExecution = {
    id: crypto.randomUUID(),
    captureId,
    phase,
    idempotencyKey,
    status: "running",
    startedAt: new Date().toISOString(),
  };
  await deps.saveExecution(execution);

  try {
    const { resultRef } = await deps.runPhase(captureId, phase);
    await deps.saveExecution({
      ...execution,
      status: "completed",
      completedAt: new Date().toISOString(),
      resultRef,
    });
    return { ok: true, phase, reused: false };
  } catch (e) {
    await deps.saveExecution({
      ...execution,
      status: "failed",
      completedAt: new Date().toISOString(),
    });
    const message = e instanceof Error ? e.message : "Fase pipeline fallita";
    return { ok: false, phase, code: "PIPELINE_PHASE_FAILED", message };
  }
}
