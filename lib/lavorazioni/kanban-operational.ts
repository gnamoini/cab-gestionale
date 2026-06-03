import { isLavorazioneInCorso } from "@/lib/lavorazioni/archived";
import { comparePrioritaLavorazione } from "@/lib/lavorazioni/priorita-order";
import { isStatoClosed, resolveStatoId } from "@/lib/lavorazioni/stati-dynamic";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

/** Kanban: solo lavorazioni operative (non archiviate). */
export function isKanbanVisible(row: Pick<LavorazioneListRow, "archived">): boolean {
  return isLavorazioneInCorso(row);
}

function findStatoConfig(
  row: LavorazioneListRow,
  stati: readonly StatoLavorazioneConfig[],
): StatoLavorazioneConfig | undefined {
  const statiList = [...stati];
  const statoId = resolveStatoId(row.stato, statiList);
  return statiList.find((c) => c.id === statoId);
}

/** Kanban colonna COMPLETATE: stato workflow chiuso, non archiviato. */
export function isKanbanCompletateRow(
  row: LavorazioneListRow,
  stati: readonly StatoLavorazioneConfig[],
): boolean {
  if (!isKanbanVisible(row)) return false;
  const col = findStatoConfig(row, stati);
  return col != null && isStatoClosed(col);
}

function ingressoSortKey(row: LavorazioneListRow): number {
  const raw = row.data_ingresso?.trim() || row.created_at?.trim();
  if (!raw) return Number.POSITIVE_INFINITY;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

/** Ordine card Kanban: priorità desc → ingresso asc → tie-breaker stabile. */
export function compareKanbanCards(a: LavorazioneListRow, b: LavorazioneListRow): number {
  const byPriority = comparePrioritaLavorazione(b.priorita, a.priorita);
  if (byPriority !== 0) return byPriority;

  const byIngresso = ingressoSortKey(a) - ingressoSortKey(b);
  if (byIngresso !== 0) return byIngresso;

  const byCreated = (a.created_at ?? "").localeCompare(b.created_at ?? "");
  if (byCreated !== 0) return byCreated;

  return a.id.localeCompare(b.id);
}

export function sortKanbanCards(rows: readonly LavorazioneListRow[]): LavorazioneListRow[] {
  return [...rows].sort(compareKanbanCards);
}

export type KanbanPartition = {
  operational: LavorazioneListRow[];
  completate: LavorazioneListRow[];
};

/** Separa righe Kanban in colonne workflow vs COMPLETATE (mutuamente esclusive). */
export function partitionKanbanRows(
  rows: readonly LavorazioneListRow[],
  stati: readonly StatoLavorazioneConfig[],
): KanbanPartition {
  const operational: LavorazioneListRow[] = [];
  const completate: LavorazioneListRow[] = [];

  for (const row of rows) {
    if (!isKanbanVisible(row)) continue;
    if (isKanbanCompletateRow(row, stati)) completate.push(row);
    else operational.push(row);
  }

  return { operational, completate };
}
