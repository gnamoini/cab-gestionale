/** Diagnostica settle mutation mezzo nel path save scheda ingresso — opt-in. */
const DEBUG =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_DEBUG_INGRESSO_SAVE === "1";

const phaseStartMs = new Map<string, number>();

export type MezzoMutationSaveTraceEvent =
  | "MEZZO_MUTATION_START"
  | "MEZZO_MUTATION_REQUEST_DONE"
  | "MEZZO_ON_SETTLED_START"
  | "MEZZO_INVALIDATION_START"
  | "MEZZO_INVALIDATION_DONE"
  | "MEZZO_MUTATION_RESOLVED"
  | "LAVORAZIONE_MUTATION_START"
  | "LAVORAZIONE_MUTATION_RESOLVED";

export function logMezzoMutationSaveTrace(
  event: MezzoMutationSaveTraceEvent | string,
  detail?: Record<string, unknown>,
): void {
  if (!DEBUG) return;

  const timestamp = new Date().toISOString();
  const operation =
    typeof detail?.operation === "string" ? detail.operation : "mezzo";
  const phaseKey = `${operation}:${event}`;

  let durationMs: number | undefined;
  if (
    event === "MEZZO_MUTATION_START" ||
    event === "MEZZO_ON_SETTLED_START" ||
    event === "MEZZO_INVALIDATION_START"
  ) {
    phaseStartMs.set(phaseKey, Date.now());
  }
  if (
    event === "MEZZO_MUTATION_REQUEST_DONE" ||
    event === "MEZZO_INVALIDATION_DONE" ||
    event === "MEZZO_MUTATION_RESOLVED" ||
    event === "LAVORAZIONE_MUTATION_RESOLVED"
  ) {
    const started = phaseStartMs.get(phaseKey.replace(/_DONE$|_RESOLVED$|_REQUEST_DONE$/, "_START"));
    if (started != null) durationMs = Date.now() - started;
  }

  // eslint-disable-next-line no-console -- opt-in debug flag
  console.debug("[mezzo-mutation-save]", event, {
    timestamp,
    ...(durationMs != null ? { durationMs } : {}),
    ...detail,
  });
}
