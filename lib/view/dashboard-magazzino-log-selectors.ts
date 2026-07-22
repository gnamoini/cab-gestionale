import { extractPayloadFieldChanges } from "@/lib/gestionale-log/log-summary";
import { isImageLogAction } from "@/lib/gestionale-log/view-model";
import { isLogReverted } from "@/lib/gestionale-log/undo";
import { parseMagazzinoRicambioMeta } from "@/lib/magazzino/magazzino-meta";
import {
  formatRicambioLogLabel,
  ricambioIdFromLogRow,
} from "@/lib/magazzino/ricambio-log-label";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { isoInRange, todayUntilNowRange, type DateRange } from "@/lib/report/date-ranges";
import type {
  DashboardMagDailyMovements,
  DashboardMagMovementRow,
  DashboardMagRecentRicambioRow,
} from "@/lib/view/dashboard-widgets-selectors";
import type { LogModificaRow } from "@/src/types/supabase-tables";

const STOCK_FIELD_KEYS = new Set(["quantita"]);
const IGNORE_DATA_KEYS = new Set(["consumo_medio_mensile"]);

export type DashboardMagLogFeed = {
  movements: DashboardMagMovementRow[];
  modified: DashboardMagRecentRicambioRow[];
};

function recordFromLogPayload(payload: unknown): Record<string, unknown> | null {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return null;
  const p = payload as Record<string, unknown>;
  for (const rec of [p.snapshot, p.after, p.before]) {
    if (rec && typeof rec === "object" && !Array.isArray(rec)) return rec as Record<string, unknown>;
  }
  return null;
}

export { ricambioIdFromLogRow as ricambioIdFromMagazzinoLogRow };

function metaHasMeaningfulChange(before: unknown, after: unknown): boolean {
  const b = parseMagazzinoRicambioMeta(before);
  const a = parseMagazzinoRicambioMeta(after);
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  for (const key of keys) {
    if (JSON.stringify((b as Record<string, unknown>)[key]) !== JSON.stringify((a as Record<string, unknown>)[key])) {
      return true;
    }
  }
  return false;
}

/** Classifica voce audit magazzino per widget dashboard (solo lettura log). */
export function classifyDashboardMagazzinoLog(row: LogModificaRow): "stock" | "data" | null {
  if (isLogReverted(row)) return null;
  if (row.entita === "movimenti_ricambi") {
    return row.azione.toUpperCase() === "CREATE" ? "stock" : null;
  }
  if (row.entita !== "magazzino_ricambi") return null;

  const az = row.azione.toUpperCase();
  if (isImageLogAction(row.azione)) return "data";
  if (az === "CREATE") return "data";
  if (az === "DELETE") return null;
  if (az !== "UPDATE") return null;

  const changes = extractPayloadFieldChanges(row.payload);
  if (changes.length === 0) return null;

  let hasStock = false;
  let hasData = false;

  for (const change of changes) {
    if (STOCK_FIELD_KEYS.has(change.key)) {
      hasStock = true;
      continue;
    }
    if (IGNORE_DATA_KEYS.has(change.key)) continue;
    if (change.key === "meta") {
      if (metaHasMeaningfulChange(change.before, change.after)) hasData = true;
      continue;
    }
    hasData = true;
  }

  if (hasStock && !hasData) return "stock";
  if (hasData && !hasStock) return "data";
  if (hasStock && hasData) return "stock";
  return null;
}

function isRicambioSottoScorta(r: RicambioMagazzino): boolean {
  return r.scortaMinima > 0 && r.scorta < r.scortaMinima;
}

function toDashboardMagRicambioRow(r: RicambioMagazzino, atIso: string): DashboardMagRecentRicambioRow {
  return {
    id: r.id,
    label: r.descrizione.trim() || r.codiceFornitoreOriginale,
    marca: r.marca.trim() || "—",
    codice: r.codiceFornitoreOriginale,
    updatedAt: atIso,
    sottoScorta: isRicambioSottoScorta(r),
    scorta: r.scorta,
    scortaMinima: r.scortaMinima,
  };
}

function logRowToMovement(
  row: LogModificaRow,
  ricambiById: ReadonlyMap<string, RicambioMagazzino>,
): DashboardMagMovementRow | null {
  const ricambioId = ricambioIdFromLogRow(row);
  if (!ricambioId) return null;
  const ric = ricambiById.get(ricambioId);
  const label = formatRicambioLogLabel(ric, ricambioId);

  if (row.entita === "movimenti_ricambi") {
    const rec = recordFromLogPayload(row.payload);
    const tipoRaw = typeof rec?.tipo === "string" ? rec.tipo : "";
    const tipo = tipoRaw === "uscita" ? "uscita" : "entrata";
    const q = Math.max(0, Math.round(Number(rec?.quantita) || 0));
    return {
      id: row.id,
      tipo,
      quantita: q > 0 ? q : 1,
      at: row.created_at,
      label,
    };
  }

  const qtyChange = extractPayloadFieldChanges(row.payload).find((c) => c.key === "quantita");
  if (!qtyChange) return null;
  const before = Number(qtyChange.before);
  const after = Number(qtyChange.after);
  if (!Number.isFinite(before) || !Number.isFinite(after)) return null;
  const delta = Math.round(after - before);
  if (delta === 0) return null;
  return {
    id: row.id,
    tipo: delta > 0 ? "entrata" : "uscita",
    quantita: Math.abs(delta),
    at: row.created_at,
    label,
  };
}

/**
 * Ultimi movimenti / ultimi modificati da `log_modifiche` (magazzino + movimenti).
 * Un ricambio compare al massimo in una sezione; gli eventi stock hanno priorità sui dati.
 */
export function computeDashboardMagFeedFromLogs(
  magLogs: readonly LogModificaRow[],
  movLogs: readonly LogModificaRow[],
  ricambiById: ReadonlyMap<string, RicambioMagazzino>,
  opts?: { movementLimit?: number; modifiedLimit?: number },
): DashboardMagLogFeed {
  const movementLimit = opts?.movementLimit ?? 3;
  const modifiedLimit = opts?.modifiedLimit ?? 3;

  const sorted = [...magLogs, ...movLogs].sort((a, b) => b.created_at.localeCompare(a.created_at));

  const movements: DashboardMagMovementRow[] = [];
  const modified: DashboardMagRecentRicambioRow[] = [];
  const stockRicambioIds = new Set<string>();

  for (const row of sorted) {
    const kind = classifyDashboardMagazzinoLog(row);
    if (kind !== "stock" || movements.length >= movementLimit) continue;
    const ricambioId = ricambioIdFromLogRow(row);
    if (!ricambioId || stockRicambioIds.has(ricambioId)) continue;
    const movement = logRowToMovement(row, ricambiById);
    if (!movement) continue;
    movements.push(movement);
    stockRicambioIds.add(ricambioId);
  }

  const modifiedRicambioIds = new Set<string>();
  for (const row of sorted) {
    const kind = classifyDashboardMagazzinoLog(row);
    if (kind !== "data" || modified.length >= modifiedLimit) continue;
    const ricambioId = ricambioIdFromLogRow(row);
    if (!ricambioId || stockRicambioIds.has(ricambioId) || modifiedRicambioIds.has(ricambioId)) continue;
    const ric = ricambiById.get(ricambioId);
    if (!ric || isRicambioSottoScorta(ric)) continue;
    modified.push(toDashboardMagRicambioRow(ric, row.created_at));
    modifiedRicambioIds.add(ricambioId);
  }

  return { movements, modified };
}

/** Entrate/uscite oggi (mezzanotte → adesso) da log magazzino e movimenti. */
export function computeDashboardMagDailyMovementsFromLogs(
  magLogs: readonly LogModificaRow[],
  movLogs: readonly LogModificaRow[],
  ricambiById: ReadonlyMap<string, RicambioMagazzino>,
  range: DateRange = todayUntilNowRange(),
): DashboardMagDailyMovements {
  let entrate = 0;
  let uscite = 0;
  for (const row of [...magLogs, ...movLogs]) {
    if (!isoInRange(row.created_at, range)) continue;
    if (classifyDashboardMagazzinoLog(row) !== "stock") continue;
    const movement = logRowToMovement(row, ricambiById);
    if (!movement) continue;
    if (movement.tipo === "entrata") entrate += movement.quantita;
    else uscite += movement.quantita;
  }
  return { entrate, uscite };
}
