"use client";

import { useMemo } from "react";
import {
  LavorazioniClienteUtilStack,
  LavorazioneIngressoDateCell,
  LavorazioniMezzoIdentStack,
} from "@/components/gestionale/lavorazioni/lavorazioni-table-shared";
import { TablePillReadonly } from "@/components/gestionale/lavorazioni/lavorazioni-inline-select";
import { prioritaLabel, statoPillShellClassDynamic } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { lavorazioneNoteOperative } from "@/lib/lavorazioni/lavorazione-display-helpers";
import { isStatoClosed } from "@/lib/lavorazioni/stati-dynamic";
import { prioritaDisplayColor, statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import type { PrioritaLav, StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import { resolveStatoToDbEnum } from "@/src/shared/selectors";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";

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

function KanbanCard({
  row,
  schedeStore,
  defaultAddetto,
  prioritaColors,
  flash,
  onOpen,
}: {
  row: LavorazioneListRow;
  schedeStore: LavorazioneSchedeStore;
  defaultAddetto: string;
  prioritaColors: Record<string, string | undefined>;
  flash: boolean;
  onOpen: () => void;
}) {
  const macchina = macchinaLabel(row, schedeStore);
  const ident = mezzoIdentParts(row, schedeStore);
  const p = row.priorita as PrioritaLavorazione;
  const prioHex = p === "urgente" ? "#b91c1c" : prioritaDisplayColor(p as PrioritaLav, prioritaColors);
  const note = lavorazioneNoteOperative(row, schedeStore);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={[
        "w-full rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-sm transition hover:border-orange-300/80 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/60 dark:hover:border-orange-500/40",
        flash ? "ring-2 ring-orange-400/40" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">{macchina}</p>
        <TablePillReadonly
          shellClass={statoPillShellClassDynamic()}
          shellStyle={readablePillStyleFromHex(prioHex)}
          title={prioritaLabel(p)}
          fitContent
        >
          {prioritaLabel(p)}
        </TablePillReadonly>
      </div>
      <div className="mt-2">
        <LavorazioniClienteUtilStack cliente={clienteLabel(row, schedeStore)} utilizzatore={utilizzatoreLabel(row, schedeStore)} />
      </div>
      <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
        <span className="font-semibold uppercase tracking-wide">Cantiere:</span> {cantiereLabel(row, schedeStore)}
      </p>
      <div className="mt-1">
        <LavorazioniMezzoIdentStack targa={ident.targa} matricola={ident.matricola} nScuderia={ident.scuderia} />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-600 dark:text-zinc-300">
        <LavorazioneIngressoDateCell row={row} schedeStore={schedeStore} />
        <span className="truncate font-medium">{addettoLabel(row, schedeStore, defaultAddetto)}</span>
      </div>
      {note.trim() ? (
        <p className="mt-2 line-clamp-2 text-[11px] text-zinc-500 dark:text-zinc-400">{note}</p>
      ) : null}
    </button>
  );
}

export function LavorazioniKanbanView({
  rows,
  columns,
  statiOpts,
  schedeStore,
  defaultAddetto,
  prioritaColors,
  flashRowId,
  navBulkFlashIds,
  loading,
  emptyMessage,
  onOpenRow,
}: {
  rows: readonly LavorazioneListRow[];
  columns: readonly StatoLavorazioneConfig[];
  statiOpts: readonly StatoLavorazioneConfig[];
  schedeStore: LavorazioneSchedeStore;
  defaultAddetto: string;
  prioritaColors: Record<string, string | undefined>;
  flashRowId: string | null;
  navBulkFlashIds: ReadonlySet<string>;
  loading: boolean;
  emptyMessage: string;
  onOpenRow: (row: LavorazioneListRow) => void;
}) {
  const operationalColumns = useMemo(
    () => columns.filter((col) => !isStatoClosed(col)),
    [columns],
  );

  const byStato = useMemo(() => {
    const map = new Map<string, LavorazioneListRow[]>();
    for (const col of operationalColumns) map.set(col.id, []);
    for (const row of rows) {
      const statoId = resolveStatoToDbEnum(row.stato);
      const list = map.get(statoId);
      if (list) list.push(row);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return map;
  }, [rows, operationalColumns]);

  if (loading) {
    return <p className="text-sm text-zinc-500">Caricamento…</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        {emptyMessage}
      </p>
    );
  }

  const renderColumn = (col: StatoLavorazioneConfig) => {
    const items = byStato.get(col.id) ?? [];
    return (
      <section
        key={col.id}
        className="flex w-[min(100%,17.5rem)] shrink-0 flex-col rounded-xl border border-zinc-200/90 bg-zinc-50/50 dark:border-zinc-700/80 dark:bg-zinc-900/30"
        aria-label={`Colonna ${col.label}`}
      >
        <header className="flex items-center justify-between gap-2 border-b border-zinc-200/80 px-3 py-2.5 dark:border-zinc-700/80">
          <span
            className="inline-flex max-w-full items-center rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wide"
            style={readablePillStyleFromHex(statoDisplayColor(col.id, [...statiOpts]))}
          >
            <span className="truncate">{col.label}</span>
          </span>
          <span className="shrink-0 rounded-md bg-zinc-200/80 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            {items.length}
          </span>
        </header>
        <div className="gestionale-scrollbar flex min-h-[8rem] flex-col gap-2 overflow-y-auto overscroll-contain p-2">
          {items.length === 0 ? (
            <p className="py-6 text-center text-[11px] text-zinc-400 dark:text-zinc-500">Nessuna lavorazione</p>
          ) : (
            items.map((row) => (
              <KanbanCard
                key={row.id}
                row={row}
                schedeStore={schedeStore}
                defaultAddetto={defaultAddetto}
                prioritaColors={prioritaColors}
                flash={flashRowId === row.id || navBulkFlashIds.has(row.id)}
                onOpen={() => onOpenRow(row)}
              />
            ))
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Vista rapida officina — solo lavorazioni in corso ({rows.length})
      </p>
      <div className="gestionale-scrollbar -mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-min items-start gap-3">
          {operationalColumns.map(renderColumn)}
        </div>
      </div>
    </div>
  );
}
