"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

export type OperationalTableVersions = Readonly<Record<string, number>>;

/** Tabelle il cui drift non deve mostrare banner dirty (feed/log, RBAC, …). */
export const NO_DIRTY_SIGNAL_TABLES = new Set([
  "log_modifiche",
  "user_permissions",
  "profiles",
  "app_settings",
]);

let lastTableVersions: OperationalTableVersions | null = null;

function normalizeTableVersions(raw: unknown): OperationalTableVersions {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [table, value] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof value === "number" ? value : Number(value ?? 0);
    if (Number.isFinite(n) && n > 0) out[table] = n;
  }
  return out;
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
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  const drifted: string[] = [];
  for (const table of keys) {
    if ((previous[table] ?? 0) !== (next[table] ?? 0)) drifted.push(table);
  }
  return drifted;
}

export function filterDirtySignalTables(tables: readonly string[]): string[] {
  return tables.filter((table) => !NO_DIRTY_SIGNAL_TABLES.has(table));
}

/** Poll versione: aggiorna baseline e restituisce tabelle con drift reale (vuoto al primo poll). */
export async function consumeOperationalVersionPoll(): Promise<string[]> {
  const next = await fetchOperationalTableVersions();
  const drifted = diffOperationalTableVersions(lastTableVersions, next);
  lastTableVersions = next;
  return filterDirtySignalTables(drifted);
}

export function resetOperationalVersionBaseline(): void {
  lastTableVersions = null;
}

/** @deprecated Usare consumeOperationalVersionPoll — mantenuto per test/helper. */
export function hasOperationalDataVersionDrift(
  previous: number | null,
  next: number,
): boolean {
  return previous != null && previous !== next;
}
