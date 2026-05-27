import { consolidateLogModificaRows, isNetNoOpUpdateRow } from "@/lib/gestionale-log/log-consolidate";
import { buildLogModificaSummary, mergePayloadWithSummary } from "@/lib/gestionale-log/log-summary";
import { auditPayload, isLogReverted } from "@/lib/gestionale-log/undo";
import type { LogModificaRow } from "@/src/types/supabase-tables";

/** Finestra aggregazione anti-spam (modifiche ravvicinate stesso oggetto). */
export const LOG_AGGREGATION_WINDOW_MS = 30_000;

export type ReconcileLogModificaOptions = {
  windowMs?: number;
  /** Nasconde le righe UPDATE/CREATE/DELETE sostituite da un marker `reverted` / undo. Default true. */
  suppressRevertedOriginals?: boolean;
};

function dedupeLogRowsById(rows: readonly LogModificaRow[]): LogModificaRow[] {
  const seen = new Set<string>();
  const out: LogModificaRow[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

function collectRevertedTargetIds(rows: readonly LogModificaRow[]): Set<string> {
  const targets = new Set<string>();
  for (const row of rows) {
    const p = row.payload;
    if (!p || typeof p !== "object" || Array.isArray(p)) continue;
    const rid = (p as Record<string, unknown>).reverted_log_id;
    if (typeof rid === "string" && rid.trim()) targets.add(rid.trim());
  }
  return targets;
}

function suppressRevertedOriginalRows(rows: LogModificaRow[]): LogModificaRow[] {
  const targets = collectRevertedTargetIds(rows);
  if (!targets.size) return rows;
  return rows.filter((row) => !targets.has(row.id));
}

/** CREATE + DELETE ravvicinati sullo stesso record → nessuna modifica finale (non loggare spam). */
function cancelCreateDeletePairs(rowsAsc: LogModificaRow[], windowMs: number): LogModificaRow[] {
  const removed = new Set<string>();
  for (let i = 0; i < rowsAsc.length; i++) {
    const create = rowsAsc[i]!;
    if (removed.has(create.id)) continue;
    if (create.azione !== "CREATE") continue;
    for (let j = i + 1; j < rowsAsc.length; j++) {
      const del = rowsAsc[j]!;
      if (del.azione !== "DELETE") continue;
      if (del.entita !== create.entita || del.entita_id !== create.entita_id) continue;
      if (del.autore_id !== create.autore_id) continue;
      const t0 = new Date(create.created_at).getTime();
      const t1 = new Date(del.created_at).getTime();
      if (Number.isNaN(t0) || Number.isNaN(t1) || t1 < t0 || t1 - t0 > windowMs) continue;
      removed.add(create.id);
      removed.add(del.id);
      break;
    }
  }
  return rowsAsc.filter((r) => !removed.has(r.id));
}

function snapshotRecord(row: LogModificaRow): Record<string, unknown> | null {
  const base = auditPayload(row);
  const raw = base.after ?? base.before;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  const p = row.payload;
  if (p && typeof p === "object" && !Array.isArray(p)) {
    const snap = (p as Record<string, unknown>).snapshot;
    if (snap && typeof snap === "object" && !Array.isArray(snap)) return snap as Record<string, unknown>;
  }
  return null;
}

function movimentoGroupKey(row: LogModificaRow): string | null {
  if (row.entita !== "movimenti_ricambi" || row.azione !== "CREATE") return null;
  const snap = snapshotRecord(row);
  if (!snap) return null;
  const ricambioId = typeof snap.ricambio_id === "string" ? snap.ricambio_id.trim() : "";
  const tipo = typeof snap.tipo === "string" ? snap.tipo.trim() : "";
  if (!ricambioId || !tipo) return null;
  return `${row.autore_id ?? ""}:${ricambioId}:${tipo}`;
}

/** Aggrega CREATE movimenti stock ravvicinati (stesso ricambio/tipo/autore) in un solo evento con quantità netta. */
function aggregateMovimentiCreateBursts(rowsAsc: LogModificaRow[], windowMs: number): LogModificaRow[] {
  const out: LogModificaRow[] = [];
  let i = 0;
  while (i < rowsAsc.length) {
    const row = rowsAsc[i]!;
    const key = movimentoGroupKey(row);
    if (!key) {
      out.push(row);
      i += 1;
      continue;
    }
    const group: LogModificaRow[] = [row];
    let j = i + 1;
    while (j < rowsAsc.length) {
      const next = rowsAsc[j]!;
      if (movimentoGroupKey(next) !== key) break;
      const t0 = new Date(group[group.length - 1]!.created_at).getTime();
      const t1 = new Date(next.created_at).getTime();
      if (Number.isNaN(t0) || Number.isNaN(t1) || t1 - t0 > windowMs) break;
      group.push(next);
      j += 1;
    }
    if (group.length === 1) {
      out.push(row);
    } else {
      out.push(mergeMovimentiCreateGroup(group));
    }
    i = j;
  }
  return out;
}

function mergeMovimentiCreateGroup(group: LogModificaRow[]): LogModificaRow {
  const newest = group[group.length - 1]!;
  const firstSnap = snapshotRecord(group[0]!) ?? {};
  let totalQty = 0;
  for (const r of group) {
    const snap = snapshotRecord(r);
    const q = Number(snap?.quantita);
    if (!Number.isNaN(q)) totalQty += q;
  }
  const mergedSnap = { ...firstSnap, quantita: totalQty };
  const mergedRaw: Record<string, unknown> = {
    snapshot: mergedSnap,
    aggregated_count: group.length,
  };
  const summary = buildLogModificaSummary({
    entita: newest.entita,
    entita_id: newest.entita_id,
    azione: "CREATE",
    payload: mergedRaw,
  });
  if (group.length > 1 && summary.modifiche.length === 0) {
    const tipo = typeof firstSnap.tipo === "string" ? firstSnap.tipo : "movimento";
    summary.modifiche = [
      `${tipo === "uscita" ? "Scarico" : "Carico"} magazzino aggregato · quantità totale ${totalQty}`,
    ];
    summary.tipoRiga = "MOVIMENTO MAGAZZINO";
  }
  return {
    ...newest,
    payload: mergePayloadWithSummary(mergedRaw, summary),
  };
}

function dropNetNoOpUpdates(rows: LogModificaRow[]): LogModificaRow[] {
  return rows.filter((row) => {
    if (isLogReverted(row)) return true;
    if (row.azione === "UPDATE" && isNetNoOpUpdateRow(row)) return false;
    return true;
  });
}

/**
 * Pipeline lettura log: dedup id, soppressione revert, annullamento create/delete,
 * coalescing UPDATE, aggregazione movimenti stock, rimozione net-no-op.
 * Output in ordine cronologico decrescente (come API).
 */
export function reconcileLogModificaRows(
  rows: readonly LogModificaRow[],
  options?: ReconcileLogModificaOptions,
): LogModificaRow[] {
  const windowMs = options?.windowMs ?? LOG_AGGREGATION_WINDOW_MS;
  const suppressReverted = options?.suppressRevertedOriginals !== false;

  let work = dedupeLogRowsById(rows);
  if (suppressReverted) work = suppressRevertedOriginalRows(work);

  const asc = [...work].sort((a, b) => a.created_at.localeCompare(b.created_at));
  let reconciledAsc = cancelCreateDeletePairs(asc, windowMs);
  reconciledAsc = aggregateMovimentiCreateBursts(reconciledAsc, windowMs);

  const consolidated = consolidateLogModificaRows(reconciledAsc, windowMs);
  return dropNetNoOpUpdates(consolidated);
}
