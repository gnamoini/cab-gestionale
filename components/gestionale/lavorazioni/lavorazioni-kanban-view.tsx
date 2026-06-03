"use client";

import { memo, useMemo, type KeyboardEvent } from "react";
import { LoadingKanbanSkeleton } from "@/components/design-system";
import { KanbanColumnScroll } from "@/components/gestionale/lavorazioni/kanban-column-scroll";
import { LavorazioniKanbanMobileBoard } from "@/components/gestionale/lavorazioni/lavorazioni-kanban-mobile-board";
import type { KanbanMobileSection } from "@/components/gestionale/lavorazioni/lavorazioni-kanban-mobile-types";
import "@/components/gestionale/lavorazioni/lavorazioni-scroll.css";
import { LavorazioneIngressoDateCell } from "@/components/gestionale/lavorazioni/lavorazioni-table-shared";
import { TablePillReadonly } from "@/components/gestionale/lavorazioni/lavorazioni-inline-select";
import {
  addettoPillShellClassDynamic,
  prioritaLabel,
  prioritaPillShellClassDynamic,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { addettoDisplayColor } from "@/lib/lavorazioni/addetto-colors-assign";
import { lavorazioneNoteOperative } from "@/lib/lavorazioni/lavorazione-display-helpers";
import { partitionKanbanRows, sortKanbanCards } from "@/lib/lavorazioni/kanban-operational";
import {
  DEFAULT_LAVORAZIONE_STATO_ID,
  isStatoClosed,
  migrateStatoConfigId,
  resolveStatoId,
  STATO_LAVORAZIONE_COMPLETATA_ID,
} from "@/lib/lavorazioni/stati-dynamic";
import { kanbanCardPriorityVisual } from "@/lib/lavorazioni/kanban-card-priority-style";
import { prioritaDisplayColor, statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import type { PrioritaLav, StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";

/** Vista Kanban: «Attesa preventivo» non ha colonna dedicata — card sotto Accettazione. */
function isAttesaPreventivoStato(col: StatoLavorazioneConfig): boolean {
  const id = col.id.trim().toLowerCase();
  const migrated = migrateStatoConfigId(col.id).toLowerCase();
  const label = col.label.trim().toLowerCase();
  if (label.includes("attesa preventivo")) return true;
  if (migrated === "attesa_preventivo" || migrated === "in_attesa_preventivo") return true;
  if (id === "lav-stato-att-prev" || id.includes("att-prev") || id.includes("att_prev")) return true;
  return false;
}

function findAccettazioneColumnId(columns: readonly StatoLavorazioneConfig[]): string {
  const hit =
    columns.find((c) => migrateStatoConfigId(c.id) === DEFAULT_LAVORAZIONE_STATO_ID) ??
    columns.find((c) => c.label.trim().toLowerCase().includes("accettazione"));
  return hit?.id ?? DEFAULT_LAVORAZIONE_STATO_ID;
}

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

function addettoLabel(row: LavorazioneListRow, schedeStore: LavorazioneSchedeStore, fallbackAddetto: string): string {
  return (
    schedeStore[row.id]?.ingresso?.campi.addettoAccettazione?.trim() ||
    schedeStore[row.id]?.lavorazioni?.campi.righe
      .flatMap((r) => r.addettiAssegnati)
      .find((a) => a.addetto.trim())
      ?.addetto.trim() ||
    fallbackAddetto ||
    "—"
  );
}

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
  const ing = schedeStore?.[row.id]?.ingresso?.campi;
  const scuderiaIngresso = ing?.nScuderia?.trim() ?? "";
  if (ing) {
    return {
      targa: ing.targa?.trim() || "—",
      matricola: ing.matricola?.trim() || "—",
      scuderia: scuderiaIngresso,
    };
  }
  const m = row.mezzo;
  return {
    targa: m?.targa?.trim() || "—",
    matricola: m?.matricola?.trim() || "—",
    scuderia: "",
  };
}

const KANBAN_COLUMN_SCROLL_CLASS =
  "lavorazioni-kanban-column-scroll gestionale-scrollbar flex flex-col gap-2 p-2";

const KANBAN_COLUMN_SECTION_CLASS =
  "lavorazioni-kanban-column flex h-full min-h-0 w-[17.5rem] shrink-0 flex-col rounded-xl border border-zinc-200/90 bg-zinc-50/50 dark:border-zinc-700/80 dark:bg-zinc-900/30 lg:min-w-0 lg:w-auto lg:flex-1";

function kanbanCardOpenKey(e: KeyboardEvent, onOpen: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    onOpen();
  }
}

type KanbanCardProps = {
  row: LavorazioneListRow;
  schedeStore: LavorazioneSchedeStore;
  defaultAddetto: string;
  prioritaColors: Record<string, string | undefined>;
  addettoColors: Record<string, string | undefined>;
  flash: boolean;
  onOpen: () => void;
};

function kanbanCardPropsEqual(prev: Readonly<KanbanCardProps>, next: Readonly<KanbanCardProps>) {
  return (
    prev.row.id === next.row.id &&
    prev.row.priorita === next.row.priorita &&
    prev.row.stato === next.row.stato &&
    prev.row.updated_at === next.row.updated_at &&
    prev.row.created_at === next.row.created_at &&
    prev.flash === next.flash &&
    prev.defaultAddetto === next.defaultAddetto &&
    prev.schedeStore[prev.row.id] === next.schedeStore[next.row.id] &&
    prev.prioritaColors === next.prioritaColors &&
    prev.addettoColors === next.addettoColors
  );
}

const KanbanCard = memo(function KanbanCard({
  row,
  schedeStore,
  defaultAddetto,
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
  const addetto = addettoLabel(row, schedeStore, defaultAddetto);
  const p = row.priorita as PrioritaLavorazione;
  const prioLav = p as PrioritaLav;
  const prioVisual = kanbanCardPriorityVisual(prioLav, prioritaColors as Partial<Record<PrioritaLav, string>>);
  const prioHex = prioritaDisplayColor(prioLav, prioritaColors);
  const addettoHex = addettoDisplayColor(addetto, addettoColors as Record<string, string>);
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
            shellStyle={readablePillStyleFromHex(prioHex)}
            title={prioritaLabel(p)}
            fitContent
          >
            {prioritaLabel(p)}
          </TablePillReadonly>
          <TablePillReadonly
            shellClass={addettoPillShellClassDynamic()}
            shellStyle={readablePillStyleFromHex(addettoHex)}
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
  rows,
  columns,
  statiOpts,
  schedeStore,
  defaultAddetto,
  prioritaColors,
  addettoColors,
  flashRowId,
  navBulkFlashIds,
  loading,
  emptyMessage,
  closedEmptyMessage = "Nessuna lavorazione completata.",
  onOpenRow,
  onOpenClosedRow,
}: {
  rows: readonly LavorazioneListRow[];
  columns: readonly StatoLavorazioneConfig[];
  statiOpts: readonly StatoLavorazioneConfig[];
  schedeStore: LavorazioneSchedeStore;
  defaultAddetto: string;
  prioritaColors: Record<string, string | undefined>;
  addettoColors: Record<string, string | undefined>;
  flashRowId: string | null;
  navBulkFlashIds: ReadonlySet<string>;
  loading: boolean;
  emptyMessage: string;
  closedEmptyMessage?: string;
  onOpenRow: (row: LavorazioneListRow) => void;
  onOpenClosedRow?: (row: LavorazioneListRow) => void;
}) {
  const operationalColumns = useMemo(
    () => columns.filter((col) => !isStatoClosed(col)),
    [columns],
  );

  const kanbanColumns = useMemo(
    () => operationalColumns.filter((col) => !isAttesaPreventivoStato(col)),
    [operationalColumns],
  );

  const accettazioneColumnId = useMemo(() => findAccettazioneColumnId(operationalColumns), [operationalColumns]);

  const attesaPreventivoColumns = useMemo(
    () => operationalColumns.filter(isAttesaPreventivoStato),
    [operationalColumns],
  );

  const { operational: operationalRows, completate: completateRows } = useMemo(
    () => partitionKanbanRows(rows, statiOpts),
    [rows, statiOpts],
  );

  const { byStato, attesaPreventivoByStato } = useMemo(() => {
    const statiList = [...statiOpts];
    const map = new Map<string, LavorazioneListRow[]>();
    const attesaMap = new Map<string, LavorazioneListRow[]>();
    for (const col of kanbanColumns) map.set(col.id, []);
    for (const col of attesaPreventivoColumns) attesaMap.set(col.id, []);
    const fallbackAttesaId = attesaPreventivoColumns[0]?.id;

    for (const row of operationalRows) {
      const statoId = resolveStatoId(row.stato, statiList);
      const statoCol = statiList.find((c) => c.id === statoId);
      if (statoCol && isAttesaPreventivoStato(statoCol)) {
        const attesaList = attesaMap.get(statoId) ?? (fallbackAttesaId ? attesaMap.get(fallbackAttesaId) : undefined);
        attesaList?.push(row);
        continue;
      }
      const list = map.get(statoId);
      if (list) list.push(row);
    }

    for (const col of kanbanColumns) {
      map.set(col.id, sortKanbanCards(map.get(col.id) ?? []));
    }
    for (const col of attesaPreventivoColumns) {
      attesaMap.set(col.id, sortKanbanCards(attesaMap.get(col.id) ?? []));
    }

    return { byStato: map, attesaPreventivoByStato: attesaMap };
  }, [operationalRows, kanbanColumns, attesaPreventivoColumns, statiOpts]);

  const completateColumn = useMemo(() => findCompletateColumnConfig(statiOpts), [statiOpts]);
  const completateItems = useMemo(() => sortKanbanCards(completateRows), [completateRows]);
  const openClosedRow = onOpenClosedRow ?? onOpenRow;

  const mobileSections = useMemo((): KanbanMobileSection[] => {
    const sections: KanbanMobileSection[] = [];
    for (const col of kanbanColumns) {
      if (col.id === accettazioneColumnId && attesaPreventivoColumns.length > 0) {
        sections.push({
          id: col.id,
          col,
          items: byStato.get(col.id) ?? [],
          nested: attesaPreventivoColumns.map((apCol) => ({
            col: apCol,
            items: attesaPreventivoByStato.get(apCol.id) ?? [],
          })),
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
    return sections;
  }, [
    kanbanColumns,
    accettazioneColumnId,
    attesaPreventivoColumns,
    byStato,
    attesaPreventivoByStato,
    completateColumn,
    completateItems,
    onOpenRow,
    openClosedRow,
  ]);

  const mobileCardLabels = useMemo(
    () => ({
      macchina: (row: LavorazioneListRow) => macchinaLabel(row, schedeStore),
      cliente: (row: LavorazioneListRow) => clienteLabel(row, schedeStore),
      identSummary: (row: LavorazioneListRow) => identSummaryLabel(row, schedeStore),
      addetto: (row: LavorazioneListRow) => addettoLabel(row, schedeStore, defaultAddetto),
    }),
    [schedeStore, defaultAddetto],
  );

  if (loading) {
    return <LoadingKanbanSkeleton />;
  }

  if (rows.length === 0 && completateItems.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        {emptyMessage}
      </p>
    );
  }

  const renderKanbanCards = (
    items: readonly LavorazioneListRow[],
    onOpen: (row: LavorazioneListRow) => void = onOpenRow,
  ) =>
    items.map((row) => (
      <KanbanCard
        key={row.id}
        row={row}
        schedeStore={schedeStore}
        defaultAddetto={defaultAddetto}
        prioritaColors={prioritaColors}
        addettoColors={addettoColors}
        flash={flashRowId === row.id || navBulkFlashIds.has(row.id)}
        onOpen={() => onOpen(row)}
      />
    ));

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

  const renderColumn = (col: StatoLavorazioneConfig) => {
    if (col.id === accettazioneColumnId && attesaPreventivoColumns.length > 0) {
      const accItems = byStato.get(col.id) ?? [];
      const attesaSections = attesaPreventivoColumns.map((apCol) => ({
        col: apCol,
        items: attesaPreventivoByStato.get(apCol.id) ?? [],
      }));
      return (
        <section
          key={col.id}
          className={KANBAN_COLUMN_SECTION_CLASS}
          aria-label={`Colonna ${col.label}`}
        >
          {renderStatoHeader(col, accItems.length)}
          <KanbanColumnScroll columnId={col.id} className={KANBAN_COLUMN_SCROLL_CLASS}>
            {accItems.length === 0 ? (
              <p className="py-3 text-center text-[11px] text-zinc-400 dark:text-zinc-500">Nessuna lavorazione</p>
            ) : (
              renderKanbanCards(accItems)
            )}
            {attesaSections.map(({ col: apCol, items }) => (
              <div key={apCol.id} className="space-y-2 border-t border-zinc-200/80 pt-2 dark:border-zinc-700/80">
                {renderStatoHeader(apCol, items.length, "border-b-0 px-0 py-0")}
                {items.length === 0 ? (
                  <p className="py-3 text-center text-[11px] text-zinc-400 dark:text-zinc-500">Nessuna lavorazione</p>
                ) : (
                  renderKanbanCards(items)
                )}
              </div>
            ))}
          </KanbanColumnScroll>
        </section>
      );
    }

    const items = byStato.get(col.id) ?? [];
    return (
      <section
        key={col.id}
        className={KANBAN_COLUMN_SECTION_CLASS}
        aria-label={`Colonna ${col.label}`}
      >
        {renderStatoHeader(col, items.length)}
        <KanbanColumnScroll columnId={col.id} className={KANBAN_COLUMN_SCROLL_CLASS}>
          {items.length === 0 ? (
            <p className="py-6 text-center text-[11px] text-zinc-400 dark:text-zinc-500">Nessuna lavorazione</p>
          ) : (
            renderKanbanCards(items)
          )}
        </KanbanColumnScroll>
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
      <KanbanColumnScroll columnId={completateColumn.id} className={KANBAN_COLUMN_SCROLL_CLASS}>
        {completateItems.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-zinc-400 dark:text-zinc-500">{closedEmptyMessage}</p>
        ) : (
          renderKanbanCards(completateItems, openClosedRow)
        )}
      </KanbanColumnScroll>
    </section>
  );

  return (
    <div className="lavorazioni-kanban-scope space-y-3 max-w-full overflow-x-hidden">
      <div className="min-w-0 max-w-full lg:hidden">
        <LavorazioniKanbanMobileBoard
          sections={mobileSections}
          statiOpts={statiOpts}
          schedeStore={schedeStore}
          defaultAddetto={defaultAddetto}
          prioritaColors={prioritaColors}
          addettoColors={addettoColors}
          flashRowId={flashRowId}
          navBulkFlashIds={navBulkFlashIds}
          cardLabels={mobileCardLabels}
        />
      </div>

      <div className="lavorazioni-kanban-board gestionale-scrollbar hidden min-h-0 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 lg:block">
        <div className="flex h-[var(--lavorazioni-kanban-col-max-h)] min-h-[18rem] w-max min-w-full items-stretch gap-3 lg:w-full">
          {kanbanColumns.map(renderColumn)}
          {renderCompletateColumn()}
        </div>
      </div>
    </div>
  );
}
