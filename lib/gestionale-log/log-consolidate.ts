import {
  buildLogModificaSummary,
  extractPayloadFieldChanges,
  mergePayloadWithSummary,
  type PayloadFieldChange,
} from "@/lib/gestionale-log/log-summary";
import { auditPayload, isLogReverted } from "@/lib/gestionale-log/undo";
import { isImageLogAction } from "@/lib/gestionale-log/view-model";
import type { LogModificaRow } from "@/src/types/supabase-tables";

/** Finestra per unire modifiche consecutive allo stesso campo (ms). */
export const LOG_CONSECUTIVE_MERGE_WINDOW_MS = 60_000;

function isMergeableUpdateRow(row: LogModificaRow): boolean {
  if (isLogReverted(row)) return false;
  if (safeStr(row.azione).toUpperCase() !== "UPDATE") return false;
  if (isImageLogAction(row.azione)) return false;
  return extractPayloadFieldChanges(row.payload).length === 1;
}

function singleFieldChange(row: LogModificaRow): PayloadFieldChange | null {
  const changes = extractPayloadFieldChanges(row.payload);
  return changes.length === 1 ? changes[0]! : null;
}

function safeStr(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s);
}

/** Due UPDATE consecutivi (cronologici) sullo stesso campo, stesso autore/entità, entro la finestra. */
function canExtendMergeChain(older: LogModificaRow, newer: LogModificaRow, windowMs: number): boolean {
  if (older.entita !== newer.entita || older.entita_id !== newer.entita_id) return false;
  if (older.autore_id !== newer.autore_id) return false;
  const co = singleFieldChange(older);
  const cn = singleFieldChange(newer);
  if (!co || !cn || co.key !== cn.key) return false;
  const tOlder = new Date(older.created_at).getTime();
  const tNewer = new Date(newer.created_at).getTime();
  if (Number.isNaN(tOlder) || Number.isNaN(tNewer)) return false;
  return tNewer >= tOlder && tNewer - tOlder <= windowMs;
}

function buildMergedRow(group: LogModificaRow[]): LogModificaRow {
  const oldest = group[0]!;
  const newest = group[group.length - 1]!;
  const firstChange = singleFieldChange(oldest)!;
  const lastChange = singleFieldChange(newest)!;
  const base = auditPayload(newest) ?? {};
  const beforeObj =
    base.before && typeof base.before === "object" && !Array.isArray(base.before)
      ? { ...(base.before as Record<string, unknown>) }
      : {};
  const afterObj =
    base.after && typeof base.after === "object" && !Array.isArray(base.after)
      ? { ...(base.after as Record<string, unknown>) }
      : {};
  beforeObj[firstChange.key] = firstChange.before;
  afterObj[lastChange.key] = lastChange.after;
  const mergedRaw = { ...base, before: beforeObj, after: afterObj };
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

/**
 * Unisce voci UPDATE consecutive sullo stesso parametro (es. priorità Media→Alta→Bassa
 * diventa Media→Bassa) se distanziate al massimo `windowMs`.
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
    if (!isMergeableUpdateRow(row)) {
      out.push(row);
      i += 1;
      continue;
    }
    const group: LogModificaRow[] = [row];
    let j = i + 1;
    while (j < asc.length && isMergeableUpdateRow(asc[j]!) && canExtendMergeChain(group[group.length - 1]!, asc[j]!, windowMs)) {
      group.push(asc[j]!);
      j += 1;
    }
    out.push(group.length > 1 ? buildMergedRow(group) : row);
    i = j;
  }
  return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
