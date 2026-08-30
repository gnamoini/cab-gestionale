"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { CAB_SYNC_TABLE_USER_PERMISSIONS } from "@/lib/sync/cab-sync-bus";

export type OperationalTableVersions = Readonly<Record<string, number>>;

/** Tabelle il cui drift non deve mostrare banner dirty (feed/log, RBAC, …). */
export const NO_DIRTY_SIGNAL_TABLES = new Set([
  "log_modifiche",
  CAB_SYNC_TABLE_USER_PERMISSIONS,
  "profiles",
  "app_settings",
]);

const ACK_DEBOUNCE_MS = 400;
const VERSION_BASELINE_STORAGE_KEY = "cab-operational-versions-v1";

let lastTableVersions: OperationalTableVersions | null = null;
const pendingBaselineAck = new Set<string>();
const pendingAckTables = new Set<string>();
let ackDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let ackInFlight: Promise<void> | null = null;
let fetchVersionsOverride: (() => Promise<OperationalTableVersions>) | null = null;

function normalizeTableVersions(raw: unknown): OperationalTableVersions {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [table, value] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof value === "number" ? value : Number(value ?? 0);
    if (Number.isFinite(n) && n > 0) out[table] = n;
  }
  return out;
}

function mergeTableVersionsMonotone(
  tables: readonly string[],
  fetched: OperationalTableVersions,
): void {
  const base: Record<string, number> = { ...(lastTableVersions ?? {}) };
  for (const table of tables) {
    const fetchedVersion = fetched[table];
    if (fetchedVersion == null || !Number.isFinite(fetchedVersion)) continue;
    base[table] = Math.max(base[table] ?? 0, fetchedVersion);
  }
  lastTableVersions = base;
  persistOperationalVersionBaseline();
}

/** Cache ottimistica — RPC server è source of truth. */
export function persistOperationalVersionBaseline(): void {
  if (typeof sessionStorage === "undefined" || !lastTableVersions) return;
  try {
    sessionStorage.setItem(VERSION_BASELINE_STORAGE_KEY, JSON.stringify(lastTableVersions));
  } catch {
    /* quota / private mode */
  }
}

/** Seed in-memory al boot; non genera dirty senza RPC successiva. */
export function restoreOperationalVersionBaselineFromSession(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const raw = sessionStorage.getItem(VERSION_BASELINE_STORAGE_KEY);
    if (!raw) return;
    const parsed = normalizeTableVersions(JSON.parse(raw));
    if (Object.keys(parsed).length === 0) return;
    lastTableVersions = parsed;
  } catch {
    /* ignore */
  }
}

export function getOperationalVersionBaseline(): OperationalTableVersions | null {
  return lastTableVersions;
}

async function resolveFetchOperationalTableVersions(): Promise<OperationalTableVersions> {
  if (fetchVersionsOverride) return fetchVersionsOverride();
  return fetchOperationalTableVersions();
}

function flushAckBatch(): void {
  if (ackInFlight) return;
  const batch = [...pendingAckTables];
  pendingAckTables.clear();
  if (batch.length === 0) return;

  ackInFlight = (async () => {
    try {
      const fetched = await resolveFetchOperationalTableVersions();
      mergeTableVersionsMonotone(batch, fetched);
    } catch {
      // ponytail: ack fallito — poll può ancora rilevare drift legittimo
    } finally {
      for (const table of batch) pendingBaselineAck.delete(table);
      ackInFlight = null;
      if (pendingAckTables.size > 0) flushAckBatch();
    }
  })();
}

/**
 * Aggiorna baseline versioni dopo mutazione locale confermata.
 * Debounce condiviso, single in-flight, merge monotono solo tabelle richieste.
 */
export function acknowledgeOperationalTableVersions(tables: readonly string[]): void {
  const unique = [...new Set(tables.filter(Boolean))];
  if (unique.length === 0) return;

  for (const table of unique) {
    pendingAckTables.add(table);
    pendingBaselineAck.add(table);
  }

  if (ackDebounceTimer) clearTimeout(ackDebounceTimer);
  ackDebounceTimer = setTimeout(() => {
    ackDebounceTimer = null;
    flushAckBatch();
  }, ACK_DEBOUNCE_MS);
}

/** True mentre ack debounced/in-flight per la tabella — evita dirty spurio poll/ack race. */
export function isOperationalBaselineAckPending(table: string): boolean {
  return pendingBaselineAck.has(table);
}

export async function fetchOperationalTableVersions(): Promise<OperationalTableVersions> {
  const sb = getBrowserSupabase();
  const { data, error } = await sb.rpc("get_operational_table_versions");
  if (error) throw new Error(error.message);
  return normalizeTableVersions(data);
}

export async function fetchOperationalDataVersion(): Promise<number> {
  const versions = await fetchOperationalTableVersions();
  const values = Object.values(versions);
  return values.length > 0 ? Math.max(...values) : 0;
}

export function diffOperationalTableVersions(
  previous: OperationalTableVersions | null,
  next: OperationalTableVersions,
): string[] {
  if (!previous) return [];
  const drifted: string[] = [];
  for (const table of Object.keys(next)) {
    if ((next[table] ?? 0) > (previous[table] ?? 0)) {
      drifted.push(table);
    }
  }
  return drifted;
}

export function filterDirtySignalTables(tables: readonly string[]): string[] {
  return tables.filter((table) => !NO_DIRTY_SIGNAL_TABLES.has(table));
}

export type ConsumeOperationalVersionPollOptions = {
  detectDrift?: boolean;
};

/** Poll versione: aggiorna baseline; drift solo se `detectDrift` (default true). */
export async function consumeOperationalVersionPoll(
  opts?: ConsumeOperationalVersionPollOptions,
): Promise<string[]> {
  const detectDrift = opts?.detectDrift !== false;
  const previous = lastTableVersions;
  const next = await resolveFetchOperationalTableVersions();
  const drifted = detectDrift ? diffOperationalTableVersions(previous, next) : [];
  lastTableVersions = next;
  persistOperationalVersionBaseline();
  return filterDirtySignalTables(drifted);
}

/** Re-align baseline dopo reconnect realtime — nessun dirty. */
export async function realignOperationalVersionBaseline(): Promise<void> {
  const next = await resolveFetchOperationalTableVersions();
  lastTableVersions = next;
  persistOperationalVersionBaseline();
}

/** @deprecated Test only — preferire realignOperationalVersionBaseline. */
export function resetOperationalVersionBaseline(): void {
  lastTableVersions = null;
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(VERSION_BASELINE_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

/** @deprecated Usare consumeOperationalVersionPoll — mantenuto per test/helper. */
export function hasOperationalDataVersionDrift(
  previous: number | null,
  next: number,
): boolean {
  return previous != null && previous !== next;
}

/** Test: imposta baseline e resetta stato ack. */
export function resetOperationalVersionStateForTests(
  baseline?: OperationalTableVersions | null,
): void {
  lastTableVersions = baseline ?? null;
  pendingBaselineAck.clear();
  pendingAckTables.clear();
  if (ackDebounceTimer) {
    clearTimeout(ackDebounceTimer);
    ackDebounceTimer = null;
  }
  ackInFlight = null;
  fetchVersionsOverride = null;
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(VERSION_BASELINE_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

/** Test: mock fetch versioni RPC. */
export function setFetchOperationalTableVersionsForTests(
  fn: (() => Promise<OperationalTableVersions>) | null,
): void {
  fetchVersionsOverride = fn;
}

/** Test: esegue ack senza debounce timer. */
export async function flushAcknowledgeOperationalTableVersionsForTests(): Promise<void> {
  if (ackDebounceTimer) {
    clearTimeout(ackDebounceTimer);
    ackDebounceTimer = null;
  }
  flushAckBatch();
  if (ackInFlight) await ackInFlight;
  if (pendingAckTables.size > 0) {
    flushAckBatch();
    if (ackInFlight) await ackInFlight;
  }
}
