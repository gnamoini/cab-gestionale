import {
  buildLogModificaSummary,
  extractPayloadFieldChanges,
  isAuditMetadataFieldKey,
  mergePayloadWithSummary,
  type PayloadFieldChange,
} from "@/lib/gestionale-log/log-summary";
import { auditPayload, isLogReverted } from "@/lib/gestionale-log/undo";
import { isImageLogAction } from "@/lib/gestionale-log/view-model";
import type { LogModificaRow } from "@/src/types/supabase-tables";

/** Finestra per unire modifiche consecutive (ms). Allineata a `LOG_AGGREGATION_WINDOW_MS`. */
export const LOG_CONSECUTIVE_MERGE_WINDOW_MS = 30_000;

function safeStr(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s);
}

function fieldValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** UPDATE senza effetto netto (es. priorità Media→Alta→Media, solo metadati audit). */
export function isNetNoOpUpdateRow(row: LogModificaRow): boolean {
  if (safeStr(row.azione).toUpperCase() !== "UPDATE") return false;
  const changes = extractPayloadFieldChanges(row.payload).filter((c) => !isAuditMetadataFieldKey(c.key));
  if (!changes.length) return true;
  return changes.every((c) => fieldValuesEqual(c.before, c.after));
}

function isConsolidatableUpdateRow(row: LogModificaRow): boolean {
  if (isLogReverted(row)) return false;
  if (safeStr(row.azione).toUpperCase() !== "UPDATE") return false;
  if (isImageLogAction(row.azione)) return false;
  return extractPayloadFieldChanges(row.payload).some((c) => !isAuditMetadataFieldKey(c.key));
}

function canExtendUpdateBurst(older: LogModificaRow, newer: LogModificaRow, windowMs: number): boolean {
  if (older.entita !== newer.entita || older.entita_id !== newer.entita_id) return false;
  if (older.autore_id !== newer.autore_id) return false;
  if (!isConsolidatableUpdateRow(older) || !isConsolidatableUpdateRow(newer)) return false;
  const tOlder = new Date(older.created_at).getTime();
  const tNewer = new Date(newer.created_at).getTime();
  if (Number.isNaN(tOlder) || Number.isNaN(tNewer)) return false;
  return tNewer >= tOlder && tNewer - tOlder <= windowMs;
}

function buildBurstMergedRow(group: LogModificaRow[]): LogModificaRow {
  const oldest = group[0]!;
  const newest = group[group.length - 1]!;
  const beforeObj: Record<string, unknown> = {};
  const afterObj: Record<string, unknown> = {};

  const oldestBase = auditPayload(oldest);
  if (oldestBase.before && typeof oldestBase.before === "object" && !Array.isArray(oldestBase.before)) {
    Object.assign(beforeObj, oldestBase.before as Record<string, unknown>);
  }
  const newestBase = auditPayload(newest);
  if (newestBase.after && typeof newestBase.after === "object" && !Array.isArray(newestBase.after)) {
    Object.assign(afterObj, newestBase.after as Record<string, unknown>);
  }

  for (const row of group) {
    for (const ch of extractPayloadFieldChanges(row.payload)) {
      if (isAuditMetadataFieldKey(ch.key)) continue;
      if (!(ch.key in beforeObj)) beforeObj[ch.key] = ch.before;
      afterObj[ch.key] = ch.after;
    }
  }

  const mergedRaw = { ...auditPayload(newest), before: beforeObj, after: afterObj };
  const summary = buildLogModificaSummary({
    entita: newest.entita,
    entita_id: newest.entita_id,
    azione: newest.azione,
    payload: mergedRaw,
  });
  return {
    ...newest,
    payload: mergePayloadWithSummary(mergedRaw, summary),
  };
}

/** @deprecated Usare burst merge interno; mantenuto per test o estensioni. */
export function singleFieldChange(row: LogModificaRow): PayloadFieldChange | null {
  const changes = extractPayloadFieldChanges(row.payload);
  return changes.length === 1 ? changes[0]! : null;
}

/**
 * Unisce voci UPDATE consecutive sullo stesso record (uno o più campi) entro `windowMs`,
 * mantenendo valori iniziali e finali (coalescing stato finale).
 * Restituisce le righe in ordine cronologico decrescente (come da API).
 */
export function consolidateLogModificaRows(
  rows: readonly LogModificaRow[],
  windowMs: number = LOG_CONSECUTIVE_MERGE_WINDOW_MS,
): LogModificaRow[] {
  if (rows.length <= 1) return [...rows];
  const asc = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const out: LogModificaRow[] = [];
  let i = 0;
  while (i < asc.length) {
    const row = asc[i]!;
    if (!isConsolidatableUpdateRow(row)) {
      out.push(row);
      i += 1;
      continue;
    }
    const group: LogModificaRow[] = [row];
    let j = i + 1;
    while (j < asc.length && canExtendUpdateBurst(group[group.length - 1]!, asc[j]!, windowMs)) {
      group.push(asc[j]!);
      j += 1;
    }
    const merged = group.length > 1 ? buildBurstMergedRow(group) : row;
    if (!isNetNoOpUpdateRow(merged)) out.push(merged);
    i = j;
  }
  return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
