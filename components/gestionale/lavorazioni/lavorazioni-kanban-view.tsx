"use client";

import { memo, useCallback, useMemo, type KeyboardEvent, type ReactNode } from "react";
import {
  KanbanDndBoard,
  KanbanDndDraggable,
  KanbanDndDropZone,
} from "@/components/gestionale/lavorazioni/lavorazioni-kanban-dnd";
import { LoadingKanbanSkeleton } from "@/components/design-system";
import { KanbanColumnScroll } from "@/components/gestionale/lavorazioni/kanban-column-scroll";
import { LavorazioniKanbanMobileBoard } from "@/components/gestionale/lavorazioni/lavorazioni-kanban-mobile-board";
import type { KanbanMobileSection } from "@/components/gestionale/lavorazioni/lavorazioni-kanban-mobile-types";
import "@/components/gestionale/lavorazioni/lavorazioni-scroll.css";
import { LavorazioneIngressoDateCell } from "@/components/gestionale/lavorazioni/lavorazioni-table-shared";
import { TablePillReadonly } from "@/components/gestionale/lavorazioni/lavorazioni-inline-select";
import {
  addettoPillShellClassDynamic,
  addettoPillShellStyleForName,
  prioritaLabel,
  prioritaPillShellClassDynamic,
  prioritaPillShellStyle,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { lavorazioneNoteOperative } from "@/lib/lavorazioni/lavorazione-display-helpers";
import { lavorazioneAddettoNomeKey } from "@/lib/lavorazioni/lavorazioni-list-row-labels";
import {
  findAccettazioneColumnId,
  isAttesaPreventivoStato,
  KANBAN_UNMAPPED_COLUMN_ID,
  kanbanWorkflowColumns,
  partitionKanbanByColumn,
} from "@/lib/lavorazioni/kanban-operational";
import {
  isStatoClosed,
  migrateStatoConfigId,
  STATO_LAVORAZIONE_COMPLETATA_ID,
} from "@/lib/lavorazioni/stati-dynamic";
import { kanbanCardPriorityVisual } from "@/lib/lavorazioni/kanban-card-priority-style";
import { prioritaDisplayColor, statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import type { PrioritaLav, StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import type { KanbanViewportLayout } from "@/lib/ui/use-kanban-viewport-layout";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import { lavorazioneMezzoIdentParts } from "@/lib/lavorazioni/lavorazioni-list-row-labels";
import type { LavorazioneSchedeStore } from "@/types/schede";

const UNMAPPED_COLUMN_CONFIG: StatoLavorazioneConfig = {
  id: KANBAN_UNMAPPED_COLUMN_ID,
  label: "Stato non mappato",
  color: "#b45309",
};

function findCompletateColumnConfig(stati: readonly StatoLavorazioneConfig[]): StatoLavorazioneConfig {
  const hit =
    stati.find((c) => migrateStatoConfigId(c.id) === STATO_LAVORAZIONE_COMPLETATA_ID) ??
    stati.find((c) => isStatoClosed(c) && c.label.trim().toLowerCase().includes("complet"));
  return (
    hit ?? {
      id: STATO_LAVORAZIONE_COMPLETATA_ID,
      label: "Completate",
      color: "#15803d",
      closed: true,
    }
  );
}

function findAttesaPreventivoColumnConfig(stati: readonly StatoLavorazioneConfig[]): StatoLavorazioneConfig {
  return (
    stati.find(isAttesaPreventivoStato) ?? {
      id: "attesa_preventivo",
      label: "Attesa preventivo",
      color: "#ea580c",
    }
  );
}

function macchinaLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  const ing = schedeStore?.[row.id]?.ingresso?.campi;
  if (ing?.marcaAttrezzatura?.trim() || ing?.modelloAttrezzatura?.trim()) {
    return [ing.marcaAttrezzatura, ing.modelloAttrezzatura].filter(Boolean).join(" ").trim() || "—";
  }
  const m = row.mezzo;
  return m ? `${m.marca} ${m.modello}`.trim() : "—";
}

function clienteLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  const fromScheda = schedeStore?.[row.id]?.ingresso?.campi.cliente?.trim();
  return fromScheda || row.mezzo?.cliente?.trim() || "—";
}

function utilizzatoreLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  return schedeStore?.[row.id]?.ingresso?.campi.utilizzatore?.trim() || row.mezzo?.utilizzatore?.trim() || "";
}

function cantiereLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  return schedeStore?.[row.id]?.ingresso?.campi.cantiere?.trim() || "—";
}

import { resolveAddettoDisplayLabel } from "@/lib/lavorazioni/resolve-addetto-display";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
function identValue(raw: string): string {
  const t = raw.trim();
  return t && t !== "—" ? t : "";
}

function mezzoIdentLines(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string[] {
  const parts = mezzoIdentParts(row, schedeStore);
  return [parts.targa, parts.matricola, parts.scuderia].map(identValue).filter(Boolean);
}

function identSummaryLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string | null {
  const lines = mezzoIdentLines(row, schedeStore);
  if (lines.length === 0) return null;
  return lines.slice(0, 2).join(" · ");
}

function mezzoIdentParts(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore) {
  const parts = lavorazioneMezzoIdentParts(row, schedeStore);
  return {
    targa: parts.targa || "—",
    matricola: parts.matricola || "—",
    scuderia: parts.scuderia || "",
  };
}

const KANBAN_COLUMN_SCROLL_CLASS =
  "lavorazioni-kanban-column-scroll gestionale-scrollbar flex flex-col gap-2 p-2";

const KANBAN_COLUMN_SECTION_CLASS =
  "lavorazioni-kanban-column flex min-w-0 flex-1 basis-0 flex-col rounded-xl border border-zinc-200/90 bg-zinc-50/50 dark:border-zinc-700/80 dark:bg-zinc-900/30";

const KANBAN_UNMAPPED_COLUMN_CLASS =
  `${KANBAN_COLUMN_SECTION_CLASS} border-amber-300/80 dark:border-amber-700/60`;

function kanbanCardOpenKey(e: KeyboardEvent, onOpen: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    onOpen();
  }
}

type KanbanCardProps = {
  row: LavorazioneListRow;
  schedeStore: LavorazioneSchedeStore;
  addettiRecords: readonly AddettoRecord[];
  prioritaColors: Record<string, string | undefined>;
  addettoColors: Record<string, string | undefined>;
  flash: boolean;
  onOpen: () => void;
};

function kanbanSchedeBundleRevision(store: LavorazioneSchedeStore, lavorazioneId: string): string {
  const bundle = store[lavorazioneId];
  return bundle ? JSON.stringify(bundle) : "";
}

function kanbanCardPropsEqual(prev: Readonly<KanbanCardProps>, next: Readonly<KanbanCardProps>) {
  return (
    prev.row.id === next.row.id &&
    prev.row.priorita === next.row.priorita &&
    prev.row.stato === next.row.stato &&
    prev.row.updated_at === next.row.updated_at &&
    prev.row.created_at === next.row.created_at &&
    prev.flash === next.flash &&
    kanbanSchedeBundleRevision(prev.schedeStore, prev.row.id) ===
      kanbanSchedeBundleRevision(next.schedeStore, next.row.id) &&
    prev.prioritaColors === next.prioritaColors &&
    prev.addettoColors === next.addettoColors &&
    prev.addettiRecords === next.addettiRecords
  );
}

const KanbanCard = memo(function KanbanCard({
  row,
  schedeStore,
  addettiRecords,
  prioritaColors,
  addettoColors,
  flash,
  onOpen,
}: KanbanCardProps) {
  const macchina = macchinaLabel(row, schedeStore);
  const cliente = clienteLabel(row, schedeStore);
  const cantiere = cantiereLabel(row, schedeStore);
  const utilizzatore = utilizzatoreLabel(row, schedeStore);
  const identLines = mezzoIdentLines(row, schedeStore);
  const addetto = resolveAddettoDisplayLabel(row, { schedeStore, addettiRecords });
  const addettoKey = lavorazioneAddettoNomeKey(row, schedeStore, undefined, addettiRecords);
  const p = row.priorita as PrioritaLavorazione;
  const prioLav = p as PrioritaLav;
  const prioVisual = kanbanCardPriorityVisual(prioLav, prioritaColors as Partial<Record<PrioritaLav, string>>);
  const prioHex = prioritaDisplayColor(prioLav, prioritaColors);
  const addettoPillStyle = addettoPillShellStyleForName(addettoKey, addettoColors);
  const note = lavorazioneNoteOperative(row, schedeStore);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => kanbanCardOpenKey(e, onOpen)}
      style={prioVisual.style}
      className={[
        "lavorazioni-kanban-card-hit w-full cursor-pointer rounded-xl border border-[color:var(--cab-border)] p-3 text-left transition-[border-color,box-shadow,background-color] duration-200 hover:border-[color:color-mix(in_srgb,var(--cab-primary)_28%,var(--cab-border))] hover:shadow-[var(--cab-shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--cab-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cab-card)]",
        prioVisual.className,
        flash ? "lavorazioni-kanban-card-flash" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start gap-2">
        <span
          className={prioVisual.dotClassName}
          style={prioVisual.dotStyle}
          aria-hidden
          title={prioritaLabel(p)}
        />
        <div className="min-w-0 flex-1 space-y-1 leading-tight">
          <p className="text-sm font-semibold leading-snug text-[color:var(--cab-text)]">{macchina}</p>
          <div className="min-w-0 space-y-0.5">
            <p className="truncate text-sm font-medium text-[color:var(--cab-text)]">{cliente}</p>
            {identValue(cantiere) ? (
              <p className="truncate text-[11px] text-[color:var(--cab-text-muted)]">{cantiere}</p>
            ) : null}
            {utilizzatore.trim() ? (
              <p className="truncate text-[11px] text-[color:color-mix(in_srgb,var(--cab-text-muted)_88%,var(--cab-text))]">
                {utilizzatore}
              </p>
            ) : null}
          </div>
          {identLines.length > 0 ? (
            <div className="min-w-0 space-y-0.5 leading-snug">
              {identLines.map((line) => (
                <p key={line} className="truncate text-[13px] font-medium text-[color:var(--cab-text)]">
                  {line}
                </p>
              ))}
            </div>
          ) : null}
          <div className="text-[11px] text-[color:var(--cab-text-muted)]">
            <LavorazioneIngressoDateCell row={row} schedeStore={schedeStore} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <TablePillReadonly
            shellClass={prioritaPillShellClassDynamic()}
            shellStyle={prioritaPillShellStyle(prioHex)}
            title={prioritaLabel(p)}
            fitContent
          >
            {prioritaLabel(p)}
          </TablePillReadonly>
          <TablePillReadonly
            shellClass={addettoPillShellClassDynamic()}
            shellStyle={addettoPillStyle}
            title={addetto}
            fitContent
          >
            {addetto}
          </TablePillReadonly>
        </div>
      </div>
      {note.trim() ? (
        <p className="mt-2 line-clamp-2 text-[11px] text-[color:var(--cab-text-muted)]">{note}</p>
      ) : null}
    </div>
  );
}, kanbanCardPropsEqual);

KanbanCard.displayName = "KanbanCard";

export function LavorazioniKanbanView({
  layout,
  rows,
  columns,
  statiOpts,
  schedeStore,
  addettiRecords,
  prioritaColors,
  addettoColors,
  flashRowId,
  navBulkFlashIds,
  loading,
  emptyMessage,
  closedEmptyMessage = "Nessuna lavorazione completata.",
  canDrag = false,
  onMoveStato,
  onOpenRow,
  onOpenClosedRow,
}: {
  layout: KanbanViewportLayout | undefined;
  rows: readonly LavorazioneListRow[];
  columns: readonly StatoLavorazioneConfig[];
  statiOpts: readonly StatoLavorazioneConfig[];
  schedeStore: LavorazioneSchedeStore;
  addettiRecords: readonly AddettoRecord[];
  prioritaColors: Record<string, string | undefined>;
  addettoColors: Record<string, string | undefined>;
  flashRowId: string | null;
  navBulkFlashIds: ReadonlySet<string>;
  loading: boolean;
  emptyMessage: string;
  closedEmptyMessage?: string;
  /** Desktop Kanban DnD — richiede permesso edit. */
  canDrag?: boolean;
  onMoveStato?: (row: LavorazioneListRow, nextStato: string) => void;
  onOpenRow: (row: LavorazioneListRow) => void;
  onOpenClosedRow?: (row: LavorazioneListRow) => void;
}) {
  const kanbanColumns = useMemo(() => kanbanWorkflowColumns(columns), [columns]);
  const workflowColumnIds = useMemo(() => new Set(kanbanColumns.map((c) => c.id)), [kanbanColumns]);
  const accettazioneColumnId = useMemo(() => findAccettazioneColumnId(columns), [columns]);
  const attesaPreventivoCol = useMemo(() => findAttesaPreventivoColumnConfig(statiOpts), [statiOpts]);
  const dndEnabled = canDrag && Boolean(onMoveStato);

  const partition = useMemo(
    () => partitionKanbanByColumn(rows, columns, statiOpts),
    [rows, columns, statiOpts],
  );

  const { byStato, attesaPreventivoNested, unmapped, completate: completateItems } = partition;
  const completateColumn = useMemo(() => findCompletateColumnConfig(statiOpts), [statiOpts]);
  const openClosedRow = onOpenClosedRow ?? onOpenRow;

  const attesaNestedForUi = useMemo(
    () =>
      attesaPreventivoNested.length > 0
        ? [{ col: attesaPreventivoCol, items: attesaPreventivoNested }]
        : undefined,
    [attesaPreventivoCol, attesaPreventivoNested],
  );

  const mobileSections = useMemo((): KanbanMobileSection[] => {
    const sections: KanbanMobileSection[] = [];
    for (const col of kanbanColumns) {
      if (col.id === accettazioneColumnId && attesaNestedForUi) {
        sections.push({
          id: col.id,
          col,
          items: byStato.get(col.id) ?? [],
          nested: attesaNestedForUi,
          onOpen: onOpenRow,
        });
      } else {
        sections.push({
          id: col.id,
          col,
          items: byStato.get(col.id) ?? [],
          onOpen: onOpenRow,
        });
      }
    }
    sections.push({
      id: completateColumn.id,
      col: completateColumn,
      items: completateItems,
      onOpen: openClosedRow,
    });
    if (unmapped.length > 0) {
      sections.push({
        id: UNMAPPED_COLUMN_CONFIG.id,
        col: UNMAPPED_COLUMN_CONFIG,
        items: unmapped,
        onOpen: onOpenRow,
      });
    }
    return sections;
  }, [
    kanbanColumns,
    accettazioneColumnId,
    attesaNestedForUi,
    byStato,
    completateColumn,
    completateItems,
    unmapped,
    onOpenRow,
    openClosedRow,
  ]);

  const mobileCardLabels = useMemo(
    () => ({
      macchina: (row: LavorazioneListRow) => macchinaLabel(row, schedeStore),
      cliente: (row: LavorazioneListRow) => clienteLabel(row, schedeStore),
      identSummary: (row: LavorazioneListRow) => identSummaryLabel(row, schedeStore),
      addetto: (row: LavorazioneListRow) => resolveAddettoDisplayLabel(row, { schedeStore, addettiRecords }),
    }),
    [schedeStore, addettiRecords],
  );

  const renderKanbanCard = useCallback(
    (
      row: LavorazioneListRow,
      onOpen: (row: LavorazioneListRow) => void,
      flash: boolean,
    ) => (
      <KanbanCard
        row={row}
        schedeStore={schedeStore}
        addettiRecords={addettiRecords}
        prioritaColors={prioritaColors}
        addettoColors={addettoColors}
        flash={flash}
        onOpen={() => onOpen(row)}
      />
    ),
    [schedeStore, addettiRecords, prioritaColors, addettoColors],
  );

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

  if (loading) {
    return <LoadingKanbanSkeleton />;
  }

  if (layout === undefined) {
    return <LoadingKanbanSkeleton />;
  }

  if (rows.length === 0 && completateItems.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        {emptyMessage}
      </p>
    );
  }

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
        <section
          key={col.id}
          className={sectionClass}
          aria-label={`Colonna ${col.label}`}
        >
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

  if (layout === "mobile") {
    return (
      <div className="lavorazioni-kanban-scope min-w-0 max-w-full space-y-3">
        <LavorazioniKanbanMobileBoard
          sections={mobileSections}
          statiOpts={statiOpts}
          schedeStore={schedeStore}
          addettiRecords={addettiRecords}
          prioritaColors={prioritaColors}
          addettoColors={addettoColors}
          flashRowId={flashRowId}
          navBulkFlashIds={navBulkFlashIds}
          cardLabels={mobileCardLabels}
        />
      </div>
    );
  }

  if (layout === "desktop") {
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

  return <LoadingKanbanSkeleton />;
}
