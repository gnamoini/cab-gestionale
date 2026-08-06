/** Diagnostica pipeline salvataggio scheda ingresso — flag opzionale, no modulo orfano post-fix. */
const DEBUG =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_DEBUG_INGRESSO_SAVE === "1";

let runIdCounter = 0;
const runStartTimes = new Map<number, number>();

const EVENT_ALIASES: Record<string, string> = {
  save_start: "SAVE_START",
  save_end: "SAVE_SUCCESS",
  save_error: "SAVE_ERROR",
  save_cancelled: "SAVE_ABORT",
  save_finally: "SAVE_FINALLY",
  commit_start: "SAVE_REQUEST",
  commit_end: "SAVE_RESPONSE",
  backend_sync_start: "SAVE_BACKEND_START",
  backend_sync_end: "SAVE_BACKEND_END",
};

export function nextIngressoSaveRunId(): number {
  runIdCounter += 1;
  return runIdCounter;
}

export function logIngressoSavePipeline(
  event: string,
  detail?: Record<string, unknown>,
): void {
  if (!DEBUG) return;

  const alias = EVENT_ALIASES[event] ?? event;
  const runId = typeof detail?.runId === "number" ? detail.runId : undefined;
  const timestamp = new Date().toISOString();

  if (event === "save_start" && runId != null) {
    runStartTimes.set(runId, Date.now());
  }

  let durationMs: number | undefined;
  if (runId != null && (event === "save_end" || event === "save_error" || event === "save_finally")) {
    const started = runStartTimes.get(runId);
    if (started != null) {
      durationMs = Date.now() - started;
      if (event === "save_finally") runStartTimes.delete(runId);
    }
  }

  // eslint-disable-next-line no-console -- opt-in debug flag
  console.debug("[ingresso-save-pipeline]", alias, {
    event,
    timestamp,
    ...(durationMs != null ? { durationMs } : {}),
    ...detail,
  });
}
