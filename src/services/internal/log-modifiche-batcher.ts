import type { SupabaseClient } from "@/src/lib/supabase/browser-client";
import type { AuditAzione, AuditPayload } from "@/src/services/internal/audit-log";

const BATCH_DEBOUNCE_MS = 3_500;

/** ponytail: batch solo burst magazzino (+/− scorta); altre entità scrivono subito. */
const LOG_UPDATE_BATCH_ENTITA = new Set(["magazzino_ricambi", "movimenti_ricambi"]);

type FlushWaiter = {
  resolve: () => void;
  reject: (reason?: unknown) => void;
};

type PendingLog = {
  client: SupabaseClient;
  entita: string;
  entita_id: string;
  azione: AuditAzione;
  payload?: AuditPayload;
  autore_id?: string | null;
  timer: ReturnType<typeof setTimeout>;
  waiters: FlushWaiter[];
};

const pending = new Map<string, PendingLog>();

let lifecycleRegistered = false;
let lifecycleFlush: FlushModificaLogFn | null = null;

function batchKey(entita: string, entita_id: string, azione: AuditAzione, autore_id: string | null | undefined): string {
  return `${autore_id ?? ""}:${entita}:${entita_id}:${azione}`;
}

function isDiffPayload(payload: AuditPayload | undefined): payload is { before: unknown; after: unknown } {
  return (
    payload != null &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    "before" in payload &&
    "after" in payload
  );
}

/** Unisce burst UPDATE sulla stessa entità (es. scorta +1 / −1 rapidi). */
export function mergeAuditDiffPayload(existing: AuditPayload | undefined, incoming: AuditPayload | undefined): AuditPayload | undefined {
  if (!isDiffPayload(incoming)) return incoming ?? existing;
  if (!isDiffPayload(existing)) return incoming;
  const ctx =
    incoming && typeof incoming === "object" && "context" in incoming
      ? (incoming as { context?: unknown }).context
      : (existing as { context?: unknown }).context;
  const merged: Record<string, unknown> = {
    before: existing.before,
    after: incoming.after,
  };
  if (ctx !== undefined) merged.context = ctx;
  return merged;
}

export function shouldBatchModificaLogUpdate(azione: AuditAzione, entita: string): boolean {
  return azione === "UPDATE" && LOG_UPDATE_BATCH_ENTITA.has(entita);
}

type FlushInput = {
  client: SupabaseClient;
  entita: string;
  entita_id: string;
  azione: AuditAzione;
  payload?: AuditPayload;
  autore_id?: string | null;
};

/** Inserimento diretto (senza batch) — usato dal flush. */
export type FlushModificaLogFn = (input: FlushInput) => Promise<void>;

function createFlushWaiter(): { promise: Promise<void>; waiter: FlushWaiter } {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, waiter: { resolve, reject } };
}

export function queueModificaLog(
  flush: FlushModificaLogFn,
  client: SupabaseClient,
  input: FlushInput,
): Promise<void> {
  if (!shouldBatchModificaLogUpdate(input.azione, input.entita)) {
    return flush(input);
  }

  const key = batchKey(input.entita, input.entita_id, input.azione, input.autore_id);
  const { promise, waiter } = createFlushWaiter();
  const existing = pending.get(key);
  if (existing) {
    clearTimeout(existing.timer);
    existing.payload = mergeAuditDiffPayload(existing.payload, input.payload);
    existing.waiters.push(waiter);
    existing.timer = setTimeout(() => void flushPending(key, flush), BATCH_DEBOUNCE_MS);
    return promise;
  }

  const entry: PendingLog = {
    client: input.client,
    entita: input.entita,
    entita_id: input.entita_id,
    azione: input.azione,
    payload: input.payload,
    autore_id: input.autore_id,
    waiters: [waiter],
    timer: setTimeout(() => void flushPending(key, flush), BATCH_DEBOUNCE_MS),
  };
  pending.set(key, entry);
  return promise;
}

async function flushPending(key: string, flush: FlushModificaLogFn): Promise<void> {
  const entry = pending.get(key);
  if (!entry) return;
  pending.delete(key);
  clearTimeout(entry.timer);
  const waiters = entry.waiters;
  try {
    await flush({
      client: entry.client,
      entita: entry.entita,
      entita_id: entry.entita_id,
      azione: entry.azione,
      payload: entry.payload,
      autore_id: entry.autore_id,
    });
    for (const w of waiters) w.resolve();
  } catch (error) {
    for (const w of waiters) w.reject(error);
  }
}

/** Per test, logout o pagehide: scrive subito tutti i log in coda. */
export async function flushAllModificaLogs(flush: FlushModificaLogFn): Promise<void> {
  const keys = [...pending.keys()];
  await Promise.all(
    keys.map((k) =>
      flushPending(k, flush).catch(() => {
        /* errori gestiti dal chiamante del flush */
      }),
    ),
  );
}

/** ponytail: flush su tab hide — evita perdita coda magazzino su reload/HMR. */
export function registerModificaLogPageLifecycleFlush(flush: FlushModificaLogFn): void {
  if (typeof window === "undefined" || lifecycleRegistered) return;
  lifecycleRegistered = true;
  lifecycleFlush = flush;
  const run = () => {
    if (!lifecycleFlush) return;
    void flushAllModificaLogs(lifecycleFlush);
  };
  window.addEventListener("pagehide", run);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") run();
  });
}
