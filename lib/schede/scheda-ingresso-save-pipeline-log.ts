import { createCorrelationId } from "@/lib/observability/runtime-coordination-tracer";

/** Diagnostica pipeline salvataggio scheda ingresso — flag opzionale. */
const DEBUG =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_DEBUG_INGRESSO_SAVE === "1";

let runIdCounter = 0;
const runStartTimes = new Map<number, number>();
const runCorrelationIds = new Map<number, string>();

const EVENT_ALIASES: Record<string, string> = {
  save_start: "SAVE_START",
  save_end: "SAVE_DONE",
  save_error: "SAVE_ERROR",
  save_cancelled: "SAVE_ABORT",
  save_finally: "SAVE_FINALLY",
  save_duplicate_blocked: "SAVE_DUPLICATE_BLOCKED",
  commit_start: "SAVE_COMMIT",
  commit_end: "SAVE_COMMIT",
  backend_sync_start: "SAVE_DB",
  backend_sync_end: "SAVE_DB",
  save_db: "SAVE_DB",
  save_invalidate: "SAVE_INVALIDATE",
  save_request: "SAVE_DB",
  save_response: "SAVE_DB",
};

export function nextIngressoSaveRunId(): number {
  runIdCounter += 1;
  return runIdCounter;
}

export function createIngressoSaveCorrelationId(): string {
  return createCorrelationId();
}

export function bindIngressoSaveCorrelation(runId: number, correlationId: string): void {
  runCorrelationIds.set(runId, correlationId);
}

export function resolveIngressoSaveCorrelationId(
  runId?: number,
  correlationId?: string,
): string | undefined {
  if (correlationId?.trim()) return correlationId.trim();
  if (runId != null) return runCorrelationIds.get(runId);
  return undefined;
}

export function logIngressoSavePipeline(
  event: string,
  detail?: Record<string, unknown>,
): void {
  const runId = typeof detail?.runId === "number" ? detail.runId : undefined;
  const correlationId =
    (typeof detail?.correlationId === "string" ? detail.correlationId : undefined) ??
    (runId != null ? runCorrelationIds.get(runId) : undefined);

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
      }
    }
  }

  if (DEBUG) {
     
    console.debug("[ingresso-save-pipeline]", alias, {
      event,
      timestamp,
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
