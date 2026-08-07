import { logIngressoSavePipeline } from "@/lib/schede/scheda-ingresso-save-pipeline-log";

let activeRunId = 0;

/** Registra runId corrente — abort callback stale se runId diverso. */
export function beginIngressoSaveGeneration(runId: number): void {
  if (runId > 0) activeRunId = runId;
}

export function isIngressoSaveGenerationCurrent(runId: number | undefined): boolean {
  if (!runId || runId <= 0) return true;
  return runId === activeRunId;
}

export function assertIngressoSaveGenerationCurrent(
  runId: number | undefined,
  stage: string,
): boolean {
  if (isIngressoSaveGenerationCurrent(runId)) return true;
  logIngressoSavePipeline("save_abort", { runId, stage, activeRunId });
  return false;
}

/** Test-only reset. */
export function resetIngressoSaveGenerationForTests(): void {
  activeRunId = 0;
}
