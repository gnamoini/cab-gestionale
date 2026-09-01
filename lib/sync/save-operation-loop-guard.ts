import { gestionaleLogger } from "@/lib/observability/logger";
import { logMezzoMutationSaveTrace } from "@/lib/observability/mezzo-mutation-save-trace";

/** ponytail: fallback sicurezza — conta solo save espliciti utente, mai refetch/invalidate. */
const WINDOW_MS = 30_000;
const MAX_EXPLICIT_ATTEMPTS = 5;

export const SAVE_OPERATION_LOOP_MESSAGE =
  "Il salvataggio non è riuscito perché l'operazione è entrata in un ciclo. L'operazione è stata interrotta per evitare ulteriori tentativi.";

export class SaveOperationLoopError extends Error {
  constructor(
    message = SAVE_OPERATION_LOOP_MESSAGE,
    readonly meta?: { scope: string; entityId: string; attemptCount: number },
  ) {
    super(message);
    this.name = "SaveOperationLoopError";
  }
}

const buckets = new Map<string, { count: number; firstAt: number }>();

function bucketKey(scope: string, entityId: string): string {
  return `${scope.trim()}:${entityId.trim()}`;
}

function pruneBuckets(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now - bucket.firstAt > WINDOW_MS) buckets.delete(key);
  }
}

/** Chiamare all'ingresso di un save esplicito utente (dopo lock.acquire). */
export function recordExplicitSaveAttempt(scope: string, entityId: string): void {
  const id = entityId.trim();
  if (!id) return;
  const now = Date.now();
  pruneBuckets(now);
  const key = bucketKey(scope, id);
  const existing = buckets.get(key);
  if (!existing || now - existing.firstAt > WINDOW_MS) {
    buckets.set(key, { count: 1, firstAt: now });
    return;
  }
  existing.count += 1;
  if (existing.count > MAX_EXPLICIT_ATTEMPTS) {
    logMezzoMutationSaveTrace("SAVE_LOOP_GUARD_TRIGGERED", {
      scope,
      entityId: id,
      attemptCount: existing.count,
    });
    gestionaleLogger.error("save_operation_loop_guard", {
      meta: { scope, entityId: id, attemptCount: existing.count },
    });
    throw new SaveOperationLoopError(SAVE_OPERATION_LOOP_MESSAGE, {
      scope,
      entityId: id,
      attemptCount: existing.count,
    });
  }
}

/** Chiamare in finally su save completato (ok o errore non-loop). */
export function clearExplicitSaveAttempts(scope: string, entityId: string): void {
  const id = entityId.trim();
  if (!id) return;
  buckets.delete(bucketKey(scope, id));
}

/** Test-only reset. */
export function resetSaveOperationLoopGuardForTests(): void {
  buckets.clear();
}
