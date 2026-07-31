/** Diagnostica pipeline salvataggio scheda ingresso — flag opzionale, no modulo orfano post-fix. */
const DEBUG =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_DEBUG_INGRESSO_SAVE === "1";

let runIdCounter = 0;

export function nextIngressoSaveRunId(): number {
  runIdCounter += 1;
  return runIdCounter;
}

export function logIngressoSavePipeline(
  event: string,
  detail?: Record<string, unknown>,
): void {
  if (!DEBUG) return;
  // eslint-disable-next-line no-console -- opt-in debug flag
  console.debug("[ingresso-save-pipeline]", event, detail ?? {});
}
