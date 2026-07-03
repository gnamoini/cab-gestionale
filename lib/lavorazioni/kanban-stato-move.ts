import {
  isAttesaPreventivoStato,
  isKanbanCompletateRow,
  KANBAN_UNMAPPED_COLUMN_ID,
} from "@/lib/lavorazioni/kanban-operational";
import { resolveStatoId } from "@/lib/lavorazioni/stati-dynamic";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { LavorazioneListRow, LavorazioneUpdate } from "@/src/services/lavorazioni.service";

export function buildLavorazioneStatoUpdatePatch(
  nextStato: string,
  statiChiusiIds: readonly string[],
): LavorazioneUpdate {
  const data: LavorazioneUpdate = { stato: nextStato };
  if (!statiChiusiIds.includes(nextStato)) {
    data.data_uscita = null;
  }
  return data;
}

export function isKanbanDropTargetColumnId(columnId: string): boolean {
  return columnId !== KANBAN_UNMAPPED_COLUMN_ID;
}

export function resolveKanbanDropStato(
  targetColumnId: string,
  statiOpts: readonly StatoLavorazioneConfig[],
  completateColumnId: string,
): string | null {
  if (!isKanbanDropTargetColumnId(targetColumnId)) return null;
  if (targetColumnId === completateColumnId) return completateColumnId;
  const col = statiOpts.find((c) => c.id === targetColumnId);
  return col?.id ?? null;
}

export function findKanbanColumnIdForRow(
  row: LavorazioneListRow,
  statiOpts: readonly StatoLavorazioneConfig[],
  completateColumnId: string,
  attesaPreventivoColumnId: string,
  workflowColumnIds: ReadonlySet<string>,
): string {
  if (isKanbanCompletateRow(row, statiOpts)) return completateColumnId;
  const raw = row.stato?.trim() ?? "";
  if (!raw) return KANBAN_UNMAPPED_COLUMN_ID;

  const statoId = resolveStatoId(row.stato, [...statiOpts]);
  const col =
    statiOpts.find((c) => c.id === statoId) ??
    statiOpts.find((c) => c.label.trim().toLowerCase() === raw.toLowerCase());
  if (!col) return KANBAN_UNMAPPED_COLUMN_ID;
  if (isAttesaPreventivoStato(col)) return attesaPreventivoColumnId;
  if (workflowColumnIds.has(statoId)) return statoId;
  return KANBAN_UNMAPPED_COLUMN_ID;
}

export function kanbanDndDevLog(
  phase: "dragStart" | "dragEnd" | "mutate" | "rollback",
  detail: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV !== "development") return;
  console.debug(`[kanban-dnd] ${phase}`, detail);
}
