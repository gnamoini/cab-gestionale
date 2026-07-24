"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import { fmtMezziHubDt, MezziHubTabEmpty } from "@/components/gestionale/mezzi/mezzi-hub-ui";
import { MezziHubLavorazioniTimeline } from "@/components/gestionale/mezzi/mezzi-hub-lavorazioni-timeline";
import {
  buildPreventiviArchivioFilterHref,
  buildPreventiviLavorazioneFocusHref,
} from "@/lib/preventivi/preventivi-lavorazione-href";
import type { MezzoInterventoLavorazione } from "@/lib/mezzi/types";
import type { MezzoSchedaHistoryRow } from "@/src/services/domain/mezzo-schede-history.service";
import { schedeHistoryBadges } from "@/src/services/domain/mezzo-schede-history.service";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import {
  dsScrollbar,
  dsTable,
  dsTableActionTextBtn,
  dsTableActionTextBtnPrimary,
  dsTableRow,
  dsTableWrap,
} from "@/lib/ui/design-system";
import type { SchedaTipo } from "@/types/schede";

type LavorazioniViewMode = "timeline" | "tabella";

export function MezziHubLavorazioniPanel({
  interventi,
  schedeHistory,
  listPageSize,
  onClose,
  onOpenScheda,
}: {
  interventi: readonly MezzoInterventoLavorazione[];
  schedeHistory: readonly MezzoSchedaHistoryRow[];
  listPageSize: number;
  onClose: () => void;
  onOpenScheda: (lavorazioneId: string, tipo: SchedaTipo) => void;
}) {
  const [viewMode, setViewMode] = useState<LavorazioniViewMode>("timeline");

  const sortedLav = useMemo(() => {
    const rows = [...interventi];
    rows.sort((a, b) => new Date(b.dataIngresso).getTime() - new Date(a.dataIngresso).getTime());
    return rows;
  }, [interventi]);

  const {
    page: lavPage,
    setPage: setLavPage,
    pageCount: lavPageCount,
    sliceItems: sliceLav,
    showPager: showLavPager,
    label: lavPagerLabel,
  } = useClientPagination(sortedLav.length, listPageSize);

  const pagedLav = useMemo(() => sliceLav(sortedLav), [sortedLav, sliceLav, lavPage]);

  return (
    <GestionaleInfoCard
      title="Storico lavorazioni"
      subtitle={`${sortedLav.length} ${sortedLav.length === 1 ? "intervento" : "interventi"}`}
      collapsible
      defaultCollapsed={sortedLav.length === 0}
      actions={
        sortedLav.length > 0 ? (
          <Link
            href={buildPreventiviLavorazioneFocusHref(sortedLav[0]!.id, sortedLav[0]!.origine)}
            className={dsTableActionTextBtn}
            onClick={onClose}
          >
            Ultima lavorazione
          </Link>
        ) : null
      }
    >
      <LavorazioniViewToggle viewMode={viewMode} onChange={setViewMode} />

      {sortedLav.length === 0 ? (
        <MezziHubTabEmpty message="Nessuna lavorazione collegata a questo mezzo." />
      ) : viewMode === "timeline" ? (
        <MezziHubLavorazioniTimeline
          interventi={sortedLav}
          schedeHistory={schedeHistory}
          onOpenScheda={onOpenScheda}
          onClose={onClose}
        />
      ) : (
        <LavorazioniTableView
          pagedLav={pagedLav}
          schedeHistory={schedeHistory}
          onClose={onClose}
          onOpenScheda={onOpenScheda}
          showLavPager={showLavPager}
          lavPage={lavPage}
          lavPageCount={lavPageCount}
          setLavPage={setLavPage}
          lavPagerLabel={lavPagerLabel}
        />
      )}
    </GestionaleInfoCard>
  );
}

function LavorazioniViewToggle({
  viewMode,
  onChange,
}: {
  viewMode: LavorazioniViewMode;
  onChange: (mode: LavorazioniViewMode) => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="text-xs text-[color:var(--cab-text-muted)]">Vista:</span>
      <div className="inline-flex rounded-[var(--ds-radius-md)] border border-[color:var(--cab-border)] p-0.5">
        {(["timeline", "tabella"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`rounded-[var(--ds-radius-sm)] px-2.5 py-1 text-xs ${
              viewMode === mode
                ? "bg-[color:var(--cab-primary)] text-white"
                : "text-[color:var(--cab-text-muted)] hover:text-[color:var(--cab-text)]"
            }`}
            onClick={() => onChange(mode)}
          >
            {mode === "timeline" ? "Timeline" : "Tabella"}
          </button>
        ))}
      </div>
    </div>
  );
}

function LavorazioniTableView({
  pagedLav,
  schedeHistory,
  onClose,
  onOpenScheda,
  showLavPager,
  lavPage,
  lavPageCount,
  setLavPage,
  lavPagerLabel,
}: {
  pagedLav: MezzoInterventoLavorazione[];
  schedeHistory: readonly MezzoSchedaHistoryRow[];
  onClose: () => void;
  onOpenScheda: (lavorazioneId: string, tipo: SchedaTipo) => void;
  showLavPager: boolean;
  lavPage: number;
  lavPageCount: number;
  setLavPage: (p: number) => void;
  lavPagerLabel: string;
}) {
  return (
    <div className={`${dsTableWrap} ${dsScrollbar}`}>
      <table className={`${dsTable} min-w-[640px] text-xs`}>
        <GlobalTableHead>
          <GlobalTableHeadLabel label="Ingresso" />
          <GlobalTableHeadLabel label="Uscita" />
          <GlobalTableHeadLabel label="Codice" />
          <GlobalTableHeadLabel label="Stato" />
          <GlobalTableHeadLabel label="Schede" />
          <GlobalTableHeadLabel label="Descrizione" />
          <GlobalTableHeadLabel label="" thClassName="w-28" align="right" />
        </GlobalTableHead>
        <tbody>
          {pagedLav.map((r) => {
            const badges = schedeHistoryBadges(schedeHistory, r.id);
            return (
              <tr key={r.id} className={dsTableRow}>
                <td className="whitespace-nowrap px-2 py-2 font-mono text-[11px] text-[color:var(--cab-text-muted)]">
                  {fmtMezziHubDt(r.dataIngresso)}
                </td>
                <td className="whitespace-nowrap px-2 py-2 font-mono text-[11px] text-[color:var(--cab-text-muted)]">
                  {r.dataCompletamento ? fmtMezziHubDt(r.dataCompletamento) : "—"}
                </td>
                <td className="px-2 py-2 font-mono text-[11px]">{r.codice?.trim() || "—"}</td>
                <td className="px-2 py-2 text-[color:var(--cab-text)]">{r.statoFinale}</td>
                <td className="px-2 py-2 text-[color:var(--cab-text-muted)]">
                  <SchedaBadgesRow r={r} badges={badges} onOpenScheda={onOpenScheda} />
                </td>
                <td className="max-w-[240px] px-2 py-2 text-[color:var(--cab-text-muted)]">{r.descrizione || "—"}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right">
                  <div className="flex flex-nowrap justify-end gap-1">
                    <Link
                      href={buildPreventiviLavorazioneFocusHref(r.id, r.origine)}
                      className={dsTableActionTextBtnPrimary}
                      onClick={onClose}
                    >
                      Apri
                    </Link>
                    <Link
                      href={buildPreventiviArchivioFilterHref(r.id, r.origine)}
                      className={dsTableActionTextBtn}
                      onClick={onClose}
                    >
                      Preventivi
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {showLavPager ? (
        <TablePagination page={lavPage} pageCount={lavPageCount} onPageChange={setLavPage} label={lavPagerLabel} />
      ) : null}
    </div>
  );
}

function SchedaBadgesRow({
  r,
  badges,
  onOpenScheda,
}: {
  r: MezzoInterventoLavorazione;
  badges: ReturnType<typeof schedeHistoryBadges>;
  onOpenScheda: (lavorazioneId: string, tipo: SchedaTipo) => void;
}) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {badges.ingresso ? (
        <button
          type="button"
          className="rounded bg-[color:var(--cab-surface-2)] px-1.5 py-0.5 text-[10px] hover:bg-[color:var(--cab-surface-2)]/80"
          onClick={() => onOpenScheda(r.id, "ingresso")}
        >
          Ingresso
        </button>
      ) : null}
      {badges.lavorazioni ? (
        <button
          type="button"
          className="rounded bg-[color:var(--cab-surface-2)] px-1.5 py-0.5 text-[10px] hover:bg-[color:var(--cab-surface-2)]/80"
          onClick={() => onOpenScheda(r.id, "lavorazioni")}
        >
          Lav.
        </button>
      ) : null}
      {badges.ricambi ? (
        <button
          type="button"
          className="rounded bg-[color:var(--cab-surface-2)] px-1.5 py-0.5 text-[10px] hover:bg-[color:var(--cab-surface-2)]/80"
          onClick={() => onOpenScheda(r.id, "ricambi")}
        >
          Ric.
        </button>
      ) : null}
      {!badges.ingresso && !badges.lavorazioni && !badges.ricambi ? "—" : null}
    </span>
  );
}
