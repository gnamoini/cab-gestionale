import { createCorrelationId } from "@/lib/observability/runtime-coordination-tracer";

/** Diagnostica pipeline salvataggio scheda ingresso — flag opzionale. */
const DEBUG =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_DEBUG_INGRESSO_SAVE === "1";

let runIdCounter = 0;
let requestIdCounter = 0;
const runStartTimes = new Map<number, number>();
const runCorrelationIds = new Map<number, string>();
const runSaveAttemptIds = new Map<number, string>();
const stageStartTimes = new Map<string, number>();
const activeSaveAttempts = new Set<string>();

const EVENT_ALIASES: Record<string, string> = {
  save_start: "SAVE_START",
  save_end: "SAVE_DONE",
  save_error: "SAVE_ERROR",
  save_cancelled: "SAVE_ABORT",
  save_finally: "SAVE_FINALLY",
  save_duplicate_blocked: "SAVE_DUPLICATE_BLOCKED",
  second_submit_detected: "SECOND_SUBMIT_DETECTED",
  commit_start: "SAVE_COMMIT",
  commit_end: "SAVE_COMMIT",
  backend_sync_start: "SAVE_DB",
  backend_sync_end: "SAVE_DB",
  backend_sync_fast_path: "SAVE_DB",
  save_db: "SAVE_DB",
  save_invalidate: "SAVE_INVALIDATE",
  save_request: "SAVE_DB",
  save_response: "SAVE_DB",
  "gate_submit:start": "GATE_SUBMIT",
  "gate_submit:end": "GATE_SUBMIT",
  "mezzo_gate:start": "MEZZO_GATE",
  "mezzo_gate:end": "MEZZO_GATE",
  "mezzo_link_gate:start": "MEZZO_LINK_GATE",
  "mezzo_link_gate:end": "MEZZO_LINK_GATE",
  "persist_bundle:start": "PERSIST_BUNDLE",
  "persist_bundle:end": "PERSIST_BUNDLE",
};

export function nextIngressoSaveRunId(): number {
  runIdCounter += 1;
  return runIdCounter;
}

export function createIngressoSaveCorrelationId(): string {
  return createCorrelationId();
}

/** Identificativo univoco per click utente su Salva. */
export function createIngressoSaveAttemptId(): string {
  return createCorrelationId();
}

export function nextIngressoSaveRequestId(): string {
  requestIdCounter += 1;
  return `ingresso-req-${requestIdCounter}`;
}

export function bindIngressoSaveCorrelation(runId: number, correlationId: string): void {
  runCorrelationIds.set(runId, correlationId);
}

export function bindIngressoSaveAttempt(runId: number, saveAttemptId: string): void {
  runSaveAttemptIds.set(runId, saveAttemptId);
}

export function resolveIngressoSaveAttemptId(
  runId?: number,
  saveAttemptId?: string,
): string | undefined {
  if (saveAttemptId?.trim()) return saveAttemptId.trim();
  if (runId != null) return runSaveAttemptIds.get(runId);
  return undefined;
}

export function resolveIngressoSaveCorrelationId(
  runId?: number,
  correlationId?: string,
): string | undefined {
  if (correlationId?.trim()) return correlationId.trim();
  if (runId != null) return runCorrelationIds.get(runId);
  return undefined;
}

/** Registra tentativo utente; ritorna false se stesso saveAttemptId già attivo. */
export function registerIngressoSaveAttempt(saveAttemptId: string): boolean {
  const id = saveAttemptId.trim();
  if (!id) return true;
  if (activeSaveAttempts.has(id)) {
    logIngressoSavePipeline("second_submit_detected", { saveAttemptId: id });
    return false;
  }
  activeSaveAttempts.add(id);
  return true;
}

export function unregisterIngressoSaveAttempt(saveAttemptId: string | undefined): void {
  const id = saveAttemptId?.trim();
  if (!id) return;
  activeSaveAttempts.delete(id);
}

function stageKey(stage: string, detail?: Record<string, unknown>): string {
  const attempt =
    (typeof detail?.saveAttemptId === "string" ? detail.saveAttemptId : undefined) ??
    (typeof detail?.runId === "number" ? String(detail.runId) : "anon");
  return `${attempt}:${stage}`;
}

export function logIngressoSaveStageStart(
  stage: string,
  detail?: Record<string, unknown>,
): void {
  stageStartTimes.set(stageKey(stage, detail), Date.now());
  logIngressoSavePipeline(`${stage}:start`, detail);
}

export function logIngressoSaveStageEnd(
  stage: string,
  detail?: Record<string, unknown>,
): void {
  const key = stageKey(stage, detail);
  const started = stageStartTimes.get(key);
  const durationMs = started != null ? Date.now() - started : undefined;
  if (started != null) stageStartTimes.delete(key);
  logIngressoSavePipeline(`${stage}:end`, {
    ...detail,
    ...(durationMs != null ? { durationMs } : {}),
  });
}

export function logIngressoSavePipeline(
  event: string,
  detail?: Record<string, unknown>,
): void {
  const runId = typeof detail?.runId === "number" ? detail.runId : undefined;
  const correlationId =
    (typeof detail?.correlationId === "string" ? detail.correlationId : undefined) ??
    (runId != null ? runCorrelationIds.get(runId) : undefined);
  const saveAttemptId =
    (typeof detail?.saveAttemptId === "string" ? detail.saveAttemptId : undefined) ??
    (runId != null ? runSaveAttemptIds.get(runId) : undefined);

  if (event === "save_start" && runId != null && correlationId) {
    runCorrelationIds.set(runId, correlationId);
  }

  const alias = EVENT_ALIASES[event] ?? event.toUpperCase();
  const timestamp = new Date().toISOString();

  if (event === "save_start" && runId != null) {
    runStartTimes.set(runId, Date.now());
  }

  let durationMs: number | undefined;
  if (runId != null && (event === "save_end" || event === "save_error" || event === "save_finally")) {
    const started = runStartTimes.get(runId);
    if (started != null) {
      durationMs = Date.now() - started;
      if (event === "save_finally") {
        runStartTimes.delete(runId);
        runCorrelationIds.delete(runId);
        runSaveAttemptIds.delete(runId);
      }
    }
  }

  if (DEBUG) {
    console.debug("[ingresso-save-pipeline]", alias, {
      event,
      timestamp,
      ...(saveAttemptId ? { saveAttemptId } : {}),
      ...(correlationId ? { correlationId } : {}),
      ...(durationMs != null ? { durationMs } : {}),
      ...detail,
    });
  }
}

/** Fire-and-forget invalidation — non blocca la pipeline. */
export function reportInvalidateFailure(err: unknown): void {
  logIngressoSavePipeline("save_error", {
    stage: "invalidate",
    error: err instanceof Error ? err.message : String(err),
  });
  if (process.env.NODE_ENV === "development") {
    console.warn("[ingresso-save-pipeline] SAVE_INVALIDATE failed", err);
  }
}

/** Test-only reset. */
export function resetIngressoSavePipelineLogForTests(): void {
  runIdCounter = 0;
  requestIdCounter = 0;
  runStartTimes.clear();
  runCorrelationIds.clear();
  runSaveAttemptIds.clear();
  stageStartTimes.clear();
  activeSaveAttempts.clear();
}
