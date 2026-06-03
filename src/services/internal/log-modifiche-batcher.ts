import type { SupabaseClient } from "@/src/lib/supabase/browser-client";
import type { AuditAzione, AuditPayload } from "@/src/services/internal/audit-log";

const BATCH_DEBOUNCE_MS = 3_500;

type PendingLog = {
  client: SupabaseClient;
  entita: string;
  entita_id: string;
  azione: AuditAzione;
  payload?: AuditPayload;
  autore_id?: string | null;
  timer: ReturnType<typeof setTimeout>;
};

const pending = new Map<string, PendingLog>();

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

function shouldBatch(azione: AuditAzione): boolean {
  return azione === "UPDATE";
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

export function queueModificaLog(
  flush: FlushModificaLogFn,
  client: SupabaseClient,
  input: FlushInput,
): Promise<void> {
  if (!shouldBatch(input.azione)) {
    return flush(input);
  }

  const key = batchKey(input.entita, input.entita_id, input.azione, input.autore_id);
  const existing = pending.get(key);
  if (existing) {
    clearTimeout(existing.timer);
    existing.payload = mergeAuditDiffPayload(existing.payload, input.payload);
    existing.timer = setTimeout(() => void flushPending(key, flush), BATCH_DEBOUNCE_MS);
    return Promise.resolve();
  }

  const entry: PendingLog = {
    client: input.client,
    entita: input.entita,
    entita_id: input.entita_id,
    azione: input.azione,
    payload: input.payload,
    autore_id: input.autore_id,
    timer: setTimeout(() => void flushPending(key, flush), BATCH_DEBOUNCE_MS),
  };
  pending.set(key, entry);
  return Promise.resolve();
}

async function flushPending(key: string, flush: FlushModificaLogFn): Promise<void> {
  const entry = pending.get(key);
  if (!entry) return;
  pending.delete(key);
  clearTimeout(entry.timer);
  await flush({
    client: entry.client,
    entita: entry.entita,
    entita_id: entry.entita_id,
    azione: entry.azione,
    payload: entry.payload,
    autore_id: entry.autore_id,
  });
}

/** Per test o logout: scrive subito tutti i log in coda. */
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
