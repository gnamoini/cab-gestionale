"use client";

import { useCallback, type ReactNode } from "react";
import {
  KanbanDndBoard,
  KanbanDndDraggable,
  KanbanDndDropZone,
} from "@/components/gestionale/lavorazioni/lavorazioni-kanban-dnd";
import { KanbanColumnScroll } from "@/components/gestionale/lavorazioni/kanban-column-scroll";
import { LAVORAZIONE_EMPTY_DISPLAY } from "@/lib/lavorazioni/lavorazione-display-helpers";
import { KANBAN_UNMAPPED_COLUMN_ID } from "@/lib/lavorazioni/kanban-operational";
import { statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

const KANBAN_COLUMN_SCROLL_CLASS =
  "lavorazioni-kanban-column-scroll gestionale-scrollbar flex flex-col gap-2 p-2";

const KANBAN_COLUMN_SECTION_CLASS =
  "lavorazioni-kanban-column flex min-w-0 flex-1 basis-0 flex-col rounded-xl border border-zinc-200/90 bg-zinc-50/50 dark:border-zinc-700/80 dark:bg-zinc-900/30";

const KANBAN_UNMAPPED_COLUMN_CLASS =
  `${KANBAN_COLUMN_SECTION_CLASS} border-amber-300/80 dark:border-amber-700/60`;

const UNMAPPED_COLUMN_CONFIG: StatoLavorazioneConfig = {
  id: KANBAN_UNMAPPED_COLUMN_ID,
  label: "Stato non mappato",
  color: "#b45309",
};

function kanbanDisplayText(value: string | null | undefined): string {
  const t = value?.trim();
  if (!t || t === LAVORAZIONE_EMPTY_DISPLAY || t === "-") return "";
  return t;
}

function macchinaLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  const ing = schedeStore?.[row.id]?.ingresso?.campi;
  if (ing?.marcaAttrezzatura?.trim() || ing?.modelloAttrezzatura?.trim()) {
    return kanbanDisplayText(
      [ing.marcaAttrezzatura, ing.modelloAttrezzatura].filter(Boolean).join(" ").trim(),
    );
  }
  const m = row.mezzo;
  return kanbanDisplayText(m ? `${m.marca} ${m.modello}`.trim() : "");
}

export type LavorazioniKanbanDesktopBoardProps = {
  kanbanColumns: readonly StatoLavorazioneConfig[];
  workflowColumnIds: ReadonlySet<string>;
  accettazioneColumnId: string | null;
  attesaNestedForUi?: { col: StatoLavorazioneConfig; items: readonly LavorazioneListRow[] }[];
  byStato: ReadonlyMap<string, readonly LavorazioneListRow[]>;
  completateItems: readonly LavorazioneListRow[];
  unmapped: readonly LavorazioneListRow[];
  completateColumn: StatoLavorazioneConfig;
  attesaPreventivoCol: StatoLavorazioneConfig;
  rows: readonly LavorazioneListRow[];
  statiOpts: readonly StatoLavorazioneConfig[];
  schedeStore: LavorazioneSchedeStore;
  dndEnabled: boolean;
  closedEmptyMessage: string;
  flashRowId: string | null;
  navBulkFlashIds: ReadonlySet<string>;
  onOpenRow: (row: LavorazioneListRow) => void;
  openClosedRow: (row: LavorazioneListRow) => void;
  onMoveStato?: (row: LavorazioneListRow, nextStato: string) => void;
  renderKanbanCard: (
    row: LavorazioneListRow,
    onOpen: (row: LavorazioneListRow) => void,
    flash: boolean,
  ) => ReactNode;
};

export function LavorazioniKanbanDesktopBoard({
  kanbanColumns,
  workflowColumnIds,
  accettazioneColumnId,
  attesaNestedForUi,
  byStato,
  completateItems,
  unmapped,
  completateColumn,
  attesaPreventivoCol,
  rows,
  statiOpts,
  schedeStore,
  dndEnabled,
  closedEmptyMessage,
  flashRowId,
  navBulkFlashIds,
  onOpenRow,
  openClosedRow,
  onMoveStato,
  renderKanbanCard,
}: LavorazioniKanbanDesktopBoardProps) {
  const renderDragOverlay = useCallback(
    (row: LavorazioneListRow) =>
      renderKanbanCard(row, onOpenRow, flashRowId === row.id || navBulkFlashIds.has(row.id)),
    [renderKanbanCard, onOpenRow, flashRowId, navBulkFlashIds],
  );

  const renderKanbanCards = (
    items: readonly LavorazioneListRow[],
    onOpen: (row: LavorazioneListRow) => void = onOpenRow,
  ) =>
    items.map((row) => {
      const flash = flashRowId === row.id || navBulkFlashIds.has(row.id);
      const card = renderKanbanCard(row, onOpen, flash);
      if (!dndEnabled) {
        return (
          <div key={row.id} className="contents">
            {card}
          </div>
        );
      }
      return (
        <KanbanDndDraggable
          key={row.id}
          id={row.id}
          ariaLabel={`Trascina lavorazione ${macchinaLabel(row, schedeStore)}`}
        >
          {card}
        </KanbanDndDraggable>
      );
    });

  const wrapColumnDrop = (
    columnId: string,
    className: string,
    content: ReactNode,
    droppable = true,
  ) =>
    dndEnabled && droppable ? (
      <KanbanDndDropZone id={columnId} className={className}>
        {content}
      </KanbanDndDropZone>
    ) : (
      <div className={className}>{content}</div>
    );

  const renderStatoHeader = (statoCol: StatoLavorazioneConfig, count: number, className?: string) => (
    <div
      className={[
        "flex items-center justify-between gap-2 px-3 py-2.5",
        className ?? "border-b border-zinc-200/80 dark:border-zinc-700/80",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className="inline-flex max-w-full items-center rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wide"
        style={readablePillStyleFromHex(statoDisplayColor(statoCol.id, [...statiOpts]))}
      >
        <span className="truncate">{statoCol.label}</span>
      </span>
      <span className="shrink-0 rounded-md bg-zinc-200/80 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
        {count}
      </span>
    </div>
  );

  const renderColumn = (col: StatoLavorazioneConfig, sectionClass = KANBAN_COLUMN_SECTION_CLASS) => {
    if (col.id === accettazioneColumnId && attesaNestedForUi) {
      const accItems = byStato.get(col.id) ?? [];
      return (
        <section key={col.id} className={sectionClass} aria-label={`Colonna ${col.label}`}>
          {renderStatoHeader(col, accItems.length)}
          {wrapColumnDrop(
            col.id,
            "flex flex-col",
            <KanbanColumnScroll columnId={col.id} className={KANBAN_COLUMN_SCROLL_CLASS}>
              {accItems.length === 0 ? (
                <p className="py-3 text-center text-[11px] text-zinc-400 dark:text-zinc-500">Nessuna lavorazione</p>
              ) : (
                renderKanbanCards(accItems)
              )}
              {attesaNestedForUi.map(({ col: apCol, items }) => (
                <div key={apCol.id} className="space-y-2 border-t border-zinc-200/80 pt-2 dark:border-zinc-700/80">
                  {renderStatoHeader(apCol, items.length, "border-b-0 px-0 py-0")}
                  {wrapColumnDrop(
                    apCol.id,
                    "min-h-[2rem]",
                    items.length === 0 ? (
                      <p className="py-3 text-center text-[11px] text-zinc-400 dark:text-zinc-500">Nessuna lavorazione</p>
                    ) : (
                      renderKanbanCards(items)
                    ),
                  )}
                </div>
              ))}
            </KanbanColumnScroll>,
          )}
        </section>
      );
    }

    const items = byStato.get(col.id) ?? [];
    return (
      <section key={col.id} className={sectionClass} aria-label={`Colonna ${col.label}`}>
        {renderStatoHeader(col, items.length)}
        {wrapColumnDrop(
          col.id,
          "flex flex-col",
          <KanbanColumnScroll columnId={col.id} className={KANBAN_COLUMN_SCROLL_CLASS}>
            {items.length === 0 ? (
              <p className="py-6 text-center text-[11px] text-zinc-400 dark:text-zinc-500">Nessuna lavorazione</p>
            ) : (
              renderKanbanCards(items)
            )}
          </KanbanColumnScroll>,
        )}
      </section>
    );
  };

  const renderCompletateColumn = () => (
    <section
      key={completateColumn.id}
      className={KANBAN_COLUMN_SECTION_CLASS}
      aria-label="Colonna Completate"
    >
      {renderStatoHeader(completateColumn, completateItems.length)}
      {wrapColumnDrop(
        completateColumn.id,
        "flex flex-col",
        <KanbanColumnScroll columnId={completateColumn.id} className={KANBAN_COLUMN_SCROLL_CLASS}>
          {completateItems.length === 0 ? (
            <p className="py-6 text-center text-[11px] text-zinc-400 dark:text-zinc-500">{closedEmptyMessage}</p>
          ) : (
            renderKanbanCards(completateItems, openClosedRow)
          )}
        </KanbanColumnScroll>,
      )}
    </section>
  );

  const renderUnmappedColumn = () => {
    if (unmapped.length === 0) return null;
    return (
      <section
        key={UNMAPPED_COLUMN_CONFIG.id}
        className={KANBAN_UNMAPPED_COLUMN_CLASS}
        aria-label="Colonna Stato non mappato"
      >
        {renderStatoHeader(UNMAPPED_COLUMN_CONFIG, unmapped.length)}
        {wrapColumnDrop(
          UNMAPPED_COLUMN_CONFIG.id,
          "flex flex-col",
          <KanbanColumnScroll columnId={UNMAPPED_COLUMN_CONFIG.id} className={KANBAN_COLUMN_SCROLL_CLASS}>
            {renderKanbanCards(unmapped)}
          </KanbanColumnScroll>,
          false,
        )}
      </section>
    );
  };

  const board = (
    <div className="lavorazioni-kanban-board pb-1">
      <div className="flex w-full min-w-0 flex-row flex-nowrap items-start gap-3">
        {kanbanColumns.map((col) => renderColumn(col))}
        {renderUnmappedColumn()}
        {renderCompletateColumn()}
      </div>
    </div>
  );

  return (
    <div className="lavorazioni-kanban-scope max-w-full space-y-3 overflow-x-hidden">
      <KanbanDndBoard
        enabled={dndEnabled}
        rows={rows}
        statiOpts={statiOpts}
        workflowColumnIds={workflowColumnIds}
        completateColumnId={completateColumn.id}
        attesaPreventivoColumnId={attesaPreventivoCol.id}
        onMoveStato={(row, stato) => onMoveStato?.(row, stato)}
        renderDragOverlay={renderDragOverlay}
      >
        {board}
      </KanbanDndBoard>
    </div>
  );
}
