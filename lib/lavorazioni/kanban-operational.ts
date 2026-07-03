import { isLavorazioneInCorso } from "@/lib/lavorazioni/archived";
import { comparePrioritaLavorazione } from "@/lib/lavorazioni/priorita-order";
import {
  DEFAULT_LAVORAZIONE_STATO_ID,
  isStatoClosed,
  migrateStatoConfigId,
  resolveStatoId,
} from "@/lib/lavorazioni/stati-dynamic";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

export const KANBAN_UNMAPPED_COLUMN_ID = "__kanban_unmapped__";

/** Kanban: solo lavorazioni operative (non archiviate). */
export function isKanbanVisible(row: Pick<LavorazioneListRow, "archived">): boolean {
  return isLavorazioneInCorso(row);
}

export function isAttesaPreventivoStato(col: StatoLavorazioneConfig): boolean {
  const id = col.id.trim().toLowerCase();
  const migrated = migrateStatoConfigId(col.id).toLowerCase();
  const label = col.label.trim().toLowerCase();
  if (label.includes("attesa preventivo")) return true;
  if (migrated === "attesa_preventivo" || migrated === "in_attesa_preventivo") return true;
  if (id === "lav-stato-att-prev" || id.includes("att-prev") || id.includes("att_prev")) return true;
  return false;
}

export function findAccettazioneColumnId(columns: readonly StatoLavorazioneConfig[]): string {
  const hit =
    columns.find((c) => migrateStatoConfigId(c.id) === DEFAULT_LAVORAZIONE_STATO_ID) ??
    columns.find((c) => c.label.trim().toLowerCase().includes("accettazione"));
  return hit?.id ?? DEFAULT_LAVORAZIONE_STATO_ID;
}

/** Colonne workflow Kanban (operative, senza attesa preventivo). */
export function kanbanWorkflowColumns(columns: readonly StatoLavorazioneConfig[]): StatoLavorazioneConfig[] {
  return columns.filter((col) => !isStatoClosed(col) && !isAttesaPreventivoStato(col));
}

function findStatoConfig(
  row: LavorazioneListRow,
  stati: readonly StatoLavorazioneConfig[],
): StatoLavorazioneConfig | undefined {
  const raw = row.stato?.trim() ?? "";
  if (!raw) return undefined;
  const migrated = migrateStatoConfigId(raw);
  const byId = stati.find((c) => c.id === migrated) ?? stati.find((c) => c.id === raw);
  if (byId) return byId;
  return stati.find((c) => c.label.trim().toLowerCase() === raw.toLowerCase());
}

function warnKanbanUnmapped(row: LavorazioneListRow, rawStato: string, resolvedId?: string) {
  if (process.env.NODE_ENV !== "development") return;
  console.warn("[kanban] stato non mappato", {
    lavorazioneId: row.id,
    rawStato,
    resolvedId,
  });
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

export type KanbanColumnPartition = {
  byStato: Map<string, LavorazioneListRow[]>;
  attesaPreventivoNested: LavorazioneListRow[];
  unmapped: LavorazioneListRow[];
  completate: LavorazioneListRow[];
};

/** Partition SSOT: routing deterministico su input grezzo (nessun fallback implicito su colonne operative). */
export function partitionKanbanByColumn(
  rows: readonly LavorazioneListRow[],
  columns: readonly StatoLavorazioneConfig[],
  statiOpts: readonly StatoLavorazioneConfig[],
): KanbanColumnPartition {
  const { operational, completate } = partitionKanbanRows(rows, statiOpts);
  const workflowCols = kanbanWorkflowColumns(columns);
  const byStato = new Map<string, LavorazioneListRow[]>();
  for (const col of workflowCols) byStato.set(col.id, []);

  const attesaPreventivoNested: LavorazioneListRow[] = [];
  const unmapped: LavorazioneListRow[] = [];

  for (const row of operational) {
    const rawStato = row.stato?.trim() ?? "";
    const statoCol = findStatoConfig(row, statiOpts);
    if (!statoCol) {
      unmapped.push(row);
      warnKanbanUnmapped(row, rawStato);
      continue;
    }
    if (isAttesaPreventivoStato(statoCol)) {
      attesaPreventivoNested.push(row);
      continue;
    }
    const statoId = resolveStatoId(row.stato, [...statiOpts]);
    const list = byStato.get(statoId);
    if (list) {
      list.push(row);
      continue;
    }
    unmapped.push(row);
    warnKanbanUnmapped(row, rawStato, statoId);
  }

  for (const col of workflowCols) {
    byStato.set(col.id, sortKanbanCards(byStato.get(col.id) ?? []));
  }

  return {
    byStato,
    attesaPreventivoNested: sortKanbanCards(attesaPreventivoNested),
    unmapped: sortKanbanCards(unmapped),
    completate: sortKanbanCards(completate),
  };
}

/** Contract test helper — invariante su stesso input passato a partitionKanbanByColumn. */
export function assertKanbanPartitionInvariant(
  partition: KanbanColumnPartition,
  inputRows: readonly LavorazioneListRow[],
  statiOpts: readonly StatoLavorazioneConfig[],
): void {
  const { operational } = partitionKanbanRows(inputRows, statiOpts);
  const inByStato = [...partition.byStato.values()].flat();
  const total =
    inByStato.length + partition.attesaPreventivoNested.length + partition.unmapped.length;
  if (total !== operational.length) {
    throw new Error(
      `partition invariant: ${total} bucketed !== ${operational.length} operational`,
    );
  }
  const ids = new Set<string>();
  for (const row of [...inByStato, ...partition.attesaPreventivoNested, ...partition.unmapped]) {
    if (ids.has(row.id)) throw new Error(`partition invariant: duplicate id ${row.id}`);
    ids.add(row.id);
  }
}
