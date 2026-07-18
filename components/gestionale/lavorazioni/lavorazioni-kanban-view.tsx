"use client";

import { memo, useCallback, useMemo, type KeyboardEvent } from "react";
import { LoadingKanbanSkeleton } from "@/components/design-system";
import { LavorazioniKanbanDesktopBoardLazy } from "@/components/gestionale/lavorazioni/lavorazioni-kanban-lazy-panels";
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
import { lavorazioneNoteOperative, LAVORAZIONE_EMPTY_DISPLAY } from "@/lib/lavorazioni/lavorazione-display-helpers";
import { resolveAddettoDisplay } from "@/lib/lavorazioni/resolve-addetto-display";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
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
import { prioritaDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import type { PrioritaLav, StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import { useKanbanViewportLayout } from "@/lib/ui/use-kanban-viewport-layout";
import { useUIAutonomyFixEngine } from "@/lib/ui-autonomy-fix/use-ui-autonomy-fix-engine";
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

function clienteLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  const fromScheda = schedeStore?.[row.id]?.ingresso?.campi.cliente?.trim();
  return kanbanDisplayText(fromScheda || row.mezzo?.cliente?.trim() || "");
}

function utilizzatoreLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  return kanbanDisplayText(
    schedeStore?.[row.id]?.ingresso?.campi.utilizzatore?.trim() || row.mezzo?.utilizzatore?.trim() || "",
  );
}

function cantiereLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  return kanbanDisplayText(schedeStore?.[row.id]?.ingresso?.campi.cantiere?.trim() || "");
}

function identValue(raw: string): string {
  return kanbanDisplayText(raw);
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
  const addetto = resolveAddettoDisplay(row, { schedeStore, addettiRecords });
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
        <span className={prioVisual.dotClassName} style={prioVisual.dotStyle} aria-label={prioritaLabel(p)} role="img" />
        <div className="min-w-0 flex-1 space-y-1 leading-tight">
          {macchina ? (
            <p className="text-sm font-semibold leading-snug text-[color:var(--cab-text)]">{macchina}</p>
          ) : null}
          <div className="min-w-0 space-y-0.5">
            {cliente ? (
              <p className="truncate text-sm font-medium text-[color:var(--cab-text)]">{cliente}</p>
            ) : null}
            {cantiere ? (
              <p className="truncate text-[11px] text-[color:var(--cab-text-muted)]">{cantiere}</p>
            ) : null}
            {utilizzatore ? (
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
            <LavorazioneIngressoDateCell row={row} schedeStore={schedeStore} layout="inline" />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <TablePillReadonly
            shellClass={prioritaPillShellClassDynamic()}
            shellStyle={prioritaPillShellStyle(prioHex)}
            fitContent
          >
            {prioritaLabel(p)}
          </TablePillReadonly>
          {addetto ? (
            <TablePillReadonly
              shellClass={addettoPillShellClassDynamic()}
              shellStyle={addettoPillStyle}
              fitContent
            >
              {addetto}
            </TablePillReadonly>
          ) : null}
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
  const layout = useKanbanViewportLayout();
  useUIAutonomyFixEngine("/lavorazioni:kanban", []);
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
      addetto: (row: LavorazioneListRow) => resolveAddettoDisplay(row, { schedeStore, addettiRecords }),
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
    return (
      <LavorazioniKanbanDesktopBoardLazy
        kanbanColumns={kanbanColumns}
        workflowColumnIds={workflowColumnIds}
        accettazioneColumnId={accettazioneColumnId}
        attesaNestedForUi={attesaNestedForUi}
        byStato={byStato}
        completateItems={completateItems}
        unmapped={unmapped}
        completateColumn={completateColumn}
        attesaPreventivoCol={attesaPreventivoCol}
        rows={rows}
        statiOpts={statiOpts}
        schedeStore={schedeStore}
        dndEnabled={dndEnabled}
        closedEmptyMessage={closedEmptyMessage}
        flashRowId={flashRowId}
        navBulkFlashIds={navBulkFlashIds}
        onOpenRow={onOpenRow}
        openClosedRow={openClosedRow}
        onMoveStato={onMoveStato}
        renderKanbanCard={renderKanbanCard}
      />
    );
  }

  return <LoadingKanbanSkeleton />;
}
