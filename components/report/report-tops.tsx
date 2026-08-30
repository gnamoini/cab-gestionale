"use client";

import { Tooltip } from "@/components/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { cycleReportSort, ReportSortTh, type ReportSortPhase } from "@/components/report/report-sort-th";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import {
  formatTopMezzoIdentificazione,
  type ReportRowCompare,
  type TopClienteFatturatoRow,
  type TopClienteReportRow,
  type TopMezzoReportRow,
  type TopRicambioReportRow,
} from "@/lib/report/report-classifiche";
import {
  dsScrollbar,
  dsTableEmptyCell,
  dsTableTd,
  dsTableRow,
  dsTableWrap,
} from "@/lib/ui/design-system";

const wrap = `${dsTableWrap} ${dsScrollbar}`;
const tbodyTr = dsTableRow;
const tdBase = dsTableTd;
function fmtCmpLine(c: ReportRowCompare | undefined): string {
  if (!c) return "—";
  const abs = c.deltaAbs > 0 ? `+${c.deltaAbs}` : String(c.deltaAbs);
  const pct =
    c.deltaPct == null
      ? "—"
      : `${c.deltaPct > 0 ? "+" : ""}${c.deltaPct.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
  return `${abs} (${pct})`;
}

function cmpCell(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a ?? "").localeCompare(String(b ?? ""), "it");
}

type RicKey = "codice" | "nome" | "marca" | "qtaEntrata" | "qtaUscita";
type MezKey = "mezzo" | "identificazione" | "cliente" | "interventi";
type CliKey = "cliente" | "interventi" | "ultimoIso";

function mezzoSortValue(row: TopMezzoReportRow, key: MezKey): string | number {
  if (key === "identificazione") return formatTopMezzoIdentificazione(row);
  return row[key];
}

function ReportRankMetricCell({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center justify-end gap-2">
      <div
        className="hidden h-1.5 w-14 max-w-[3.5rem] shrink overflow-hidden rounded-full bg-[color:color-mix(in_srgb,var(--cab-surface-2)_70%,var(--cab-card))] md:block"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-[color:color-mix(in_srgb,var(--cab-primary)_72%,transparent)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="min-w-[1.25rem] tabular-nums font-semibold text-[color:var(--cab-text)]">{value}</span>
    </div>
  );
}

export function ReportTopRicambi({ rows, showCompare }: { rows: TopRicambioReportRow[]; showCompare: boolean }) {
  const [sortColumn, setSortColumn] = useState<RicKey | null>(null);
  const [sortPhase, setSortPhase] = useState<ReportSortPhase>("natural");

  const onSort = useCallback((k: RicKey) => {
    const n = cycleReportSort(sortColumn, sortPhase, k);
    setSortColumn(n.column as RicKey | null);
    setSortPhase(n.phase);
  }, [sortColumn, sortPhase]);

  const data = useMemo(() => {
    if (sortPhase === "natural" || sortColumn == null) return [...rows];
    const c = [...rows];
    c.sort((a, b) => {
      const va = a[sortColumn];
      const vb = b[sortColumn];
      const m = cmpCell(va, vb);
      const p = sortPhase === "asc" ? m : -m;
      if (p !== 0) return p;
      return a.rank - b.rank;
    });
    return c;
  }, [rows, sortColumn, sortPhase]);

  const pageSize = useResponsiveListPageSize();
  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(data.length, pageSize);
  useEffect(() => {
    resetPage();
  }, [rows, sortColumn, sortPhase, pageSize, resetPage]);
  const paged = useMemo(() => sliceItems(data), [data, sliceItems]);

  const colSpan = showCompare ? 7 : 6;

  return (
    <div className={wrap}>
      <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-0 text-left text-sm">
        <colgroup>
          <col className="w-6 min-w-[1.5rem] max-w-[1.75rem]" />
          <col style={{ width: "13%" }} />
          <col style={{ width: "30%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "11%" }} />
          {showCompare ? <col style={{ width: "20%" }} /> : null}
        </colgroup>
        <GlobalTableHead>
          <GlobalTableHeadLabel label="#" thClassName="w-6 min-w-[1.5rem] max-w-[1.75rem] px-0.5 text-center" align="center" />
          <ReportSortTh label="Codice" columnKey="codice" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
          <ReportSortTh label="Ricambio" columnKey="nome" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
          <ReportSortTh label="Marca" columnKey="marca" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
          <ReportSortTh label="Entrata" columnKey="qtaEntrata" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} align="right" />
          <ReportSortTh label="Uscita" columnKey="qtaUscita" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} align="right" />
          {showCompare ? <GlobalTableHeadLabel label="Δ vs confronto" align="right" /> : null}
        </GlobalTableHead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className={dsTableEmptyCell}>
                Nessun dato disponibile nel periodo selezionato.
              </td>
            </tr>
          ) : (
            paged.map((r) => (
              <tr key={r.id} className={tbodyTr}>
                <td className={`${tdBase} px-1.5 text-left text-xs tabular-nums text-[color:var(--cab-text-muted)]`}>{r.rank}</td>
                <td className={`${tdBase} whitespace-nowrap font-mono text-xs text-[color:var(--cab-text)]`}>{r.codice}</td>
                <td className={`${tdBase} min-w-0`}>
                  <Link href="/magazzino" className="line-clamp-2 font-medium text-[color:var(--cab-primary)] hover:underline">
                    {r.nome}
                  </Link>
                </td>
                <td className={`${tdBase} max-w-0 truncate text-xs`}>
                  <Tooltip content={r.marca}>
                    <span className="block truncate">{r.marca}</span>
                  </Tooltip>
                </td>
                <td className={`${tdBase} text-right tabular-nums`}>{r.qtaEntrata}</td>
                <td className={`${tdBase} text-right tabular-nums font-medium`}>{r.qtaUscita}</td>
                {showCompare ? (
                  <td className={`${tdBase} text-right text-xs tabular-nums text-[color:color-mix(in_srgb,var(--cab-text-muted)_92%,var(--cab-text))]`}>{fmtCmpLine(r.compare)}</td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {showPager ? <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} /> : null}
    </div>
  );
}

export function ReportTopMezzi({ rows, showCompare }: { rows: TopMezzoReportRow[]; showCompare: boolean }) {
  const [sortColumn, setSortColumn] = useState<MezKey | null>(null);
  const [sortPhase, setSortPhase] = useState<ReportSortPhase>("natural");

  const onSort = useCallback(
    (k: MezKey) => {
      const n = cycleReportSort(sortColumn, sortPhase, k);
      setSortColumn(n.column as MezKey | null);
      setSortPhase(n.phase);
    },
    [sortColumn, sortPhase],
  );

  const data = useMemo(() => {
    if (sortPhase === "natural" || sortColumn == null) return [...rows];
    const c = [...rows];
    c.sort((a, b) => {
      const va = mezzoSortValue(a, sortColumn);
      const vb = mezzoSortValue(b, sortColumn);
      const m = cmpCell(va, vb);
      const p = sortPhase === "asc" ? m : -m;
      if (p !== 0) return p;
      return a.rank - b.rank;
    });
    return c;
  }, [rows, sortColumn, sortPhase]);

  const maxInterventi = useMemo(() => Math.max(1, ...data.map((r) => r.interventi)), [data]);

  const pageSize = useResponsiveListPageSize();
  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(data.length, pageSize);
  useEffect(() => {
    resetPage();
  }, [rows, sortColumn, sortPhase, pageSize, resetPage]);
  const paged = useMemo(() => sliceItems(data), [data, sliceItems]);

  const colSpan = showCompare ? 6 : 5;

  return (
    <div className={wrap}>
      <table className="w-full min-w-[36rem] border-separate border-spacing-0 text-left text-xs sm:text-sm">
        <colgroup>
          <col className="w-8" />
          <col className="min-w-[10rem]" />
          <col className="min-w-[9rem]" />
          <col className="min-w-[8rem]" />
          <col className="w-[7.5rem]" />
          {showCompare ? <col className="min-w-[7rem]" /> : null}
        </colgroup>
        <GlobalTableHead>
          <GlobalTableHeadLabel label="#" thClassName="w-8 px-1 text-center" align="center" />
          <ReportSortTh label="Mezzo" columnKey="mezzo" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
          <ReportSortTh
            label="Identificazione"
            columnKey="identificazione"
            sortColumn={sortColumn}
            sortPhase={sortPhase}
            onSort={onSort}
          />
          <ReportSortTh label="Cliente" columnKey="cliente" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
          <ReportSortTh label="N° lav." columnKey="interventi" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} align="right" />
          {showCompare ? <GlobalTableHeadLabel label="Δ vs confronto" align="right" /> : null}
        </GlobalTableHead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className={dsTableEmptyCell}>
                Nessun dato disponibile nel periodo selezionato.
              </td>
            </tr>
          ) : (
            paged.map((r) => {
              const ident = formatTopMezzoIdentificazione(r);
              return (
                <tr key={r.id} className={tbodyTr}>
                  <td className={`${tdBase} px-1 text-center text-[11px] tabular-nums text-[color:var(--cab-text-muted)]`}>
                    {r.rank}
                  </td>
                  <td className={`${tdBase} min-w-0 max-w-[14rem]`}>
                    <Link
                      href="/mezzi"
                      className="line-clamp-2 font-medium leading-snug text-[color:var(--cab-primary)] hover:underline"
                      title={r.mezzo}
                    >
                      {r.mezzo}
                    </Link>
                  </td>
                  <td className={`${tdBase} min-w-0 max-w-[11rem]`}>
                    <Tooltip content={ident}><span className="block truncate font-mono text-[11px] leading-snug text-[color:var(--cab-text-muted)]">
                      {ident}
                    </span></Tooltip>
                  </td>
                  <td className={`${tdBase} min-w-0 max-w-[10rem]`}>
                    <Tooltip content={r.cliente}><span className="block truncate text-[color:var(--cab-text)]">
                      {r.cliente}
                    </span></Tooltip>
                  </td>
                  <td className={`${tdBase} text-right`}>
                    <ReportRankMetricCell value={r.interventi} max={maxInterventi} />
                  </td>
                  {showCompare ? (
                    <td
                      className={`${tdBase} text-right text-[11px] tabular-nums text-[color:color-mix(in_srgb,var(--cab-text-muted)_92%,var(--cab-text))]`}
                    >
                      {fmtCmpLine(r.compare)}
                    </td>
                  ) : null}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      {showPager ? <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} /> : null}
    </div>
  );
}


export function ReportTopClientiFatturato({ rows }: { rows: TopClienteFatturatoRow[] }) {
  const fmtEur = (n: number) =>
    new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className={wrap}>
      <table className="w-full min-w-[28rem] border-separate border-spacing-0 text-left text-xs sm:text-sm">
        <colgroup>
          <col className="w-6 min-w-[1.5rem] max-w-[1.75rem]" />
          <col style={{ width: "44%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "22%" }} />
        </colgroup>
        <GlobalTableHead>
          <GlobalTableHeadLabel label="#" thClassName="w-6 min-w-[1.5rem] max-w-[1.75rem] px-0.5 text-center" align="center" />
          <GlobalTableHeadLabel label="Cliente" />
          <GlobalTableHeadLabel label="N° fatture" align="right" />
          <GlobalTableHeadLabel label="Fatturato" align="right" />
        </GlobalTableHead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className={dsTableEmptyCell}>
                Nessun dato disponibile nel periodo selezionato.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.cliente} className={tbodyTr}>
                <td className={`${tdBase} px-1.5 text-left text-xs tabular-nums text-[color:var(--cab-text-muted)]`}>{r.rank}</td>
                <td className={`${tdBase} min-w-0 font-medium`}>
                  <Tooltip content={r.cliente}><span className="line-clamp-2">
                    {r.cliente}
                  </span></Tooltip>
                </td>
                <td className={`${tdBase} text-right tabular-nums`}>{r.fatture}</td>
                <td className={`${tdBase} text-right tabular-nums font-semibold`}>{fmtEur(r.fatturato)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ReportTopClienti({
  rows,
  showCompare,
  showPctTotale = false,
}: {
  rows: TopClienteReportRow[];
  showCompare: boolean;
  showPctTotale?: boolean;
}) {
  const [sortColumn, setSortColumn] = useState<CliKey | null>(null);
  const [sortPhase, setSortPhase] = useState<ReportSortPhase>("natural");

  const onSort = useCallback(
    (k: CliKey) => {
      const n = cycleReportSort(sortColumn, sortPhase, k);
      setSortColumn(n.column as CliKey | null);
      setSortPhase(n.phase);
    },
    [sortColumn, sortPhase],
  );

  const data = useMemo(() => {
    if (sortPhase === "natural" || sortColumn == null) return [...rows];
    const c = [...rows];
    c.sort((a, b) => {
      const va = a[sortColumn];
      const vb = b[sortColumn];
      const m = cmpCell(va, vb);
      const p = sortPhase === "asc" ? m : -m;
      if (p !== 0) return p;
      return a.rank - b.rank;
    });
    return c;
  }, [rows, sortColumn, sortPhase]);

  const pageSize = useResponsiveListPageSize();
  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(data.length, pageSize);
  useEffect(() => {
    resetPage();
  }, [rows, sortColumn, sortPhase, pageSize, resetPage]);
  const paged = useMemo(() => sliceItems(data), [data, sliceItems]);

  const maxInterventi = useMemo(() => Math.max(1, ...data.map((r) => r.interventi)), [data]);
  const totalInterventi = useMemo(() => data.reduce((s, r) => s + r.interventi, 0), [data]);

  const colSpan = (showCompare ? 1 : 0) + (showPctTotale ? 1 : 0) + 4;

  return (
    <div className={wrap}>
      <table className="w-full min-w-[28rem] border-separate border-spacing-0 text-left text-xs sm:text-sm">
        <colgroup>
          <col className="w-6 min-w-[1.5rem] max-w-[1.75rem]" />
          <col style={{ width: "38%" }} />
          <col style={{ width: "14%" }} />
          {showPctTotale ? <col style={{ width: "10%" }} /> : null}
          <col style={{ width: showPctTotale ? "18%" : "20%" }} />
          {showCompare ? <col style={{ width: "26%" }} /> : null}
        </colgroup>
        <GlobalTableHead>
          <GlobalTableHeadLabel label="#" thClassName="w-6 min-w-[1.5rem] max-w-[1.75rem] px-0.5 text-center" align="center" />
          <ReportSortTh label="Cliente" columnKey="cliente" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
          <ReportSortTh label="N° interventi" columnKey="interventi" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} align="right" />
          {showPctTotale ? <GlobalTableHeadLabel label="% totale" align="right" /> : null}
          <ReportSortTh label="Ultimo" columnKey="ultimoIso" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} align="right" />
          {showCompare ? <GlobalTableHeadLabel label="Δ vs confronto" align="right" /> : null}
        </GlobalTableHead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className={dsTableEmptyCell}>
                Nessun dato disponibile nel periodo selezionato.
              </td>
            </tr>
          ) : (
            paged.map((r) => (
              <tr key={r.cliente} className={tbodyTr}>
                <td className={`${tdBase} px-1.5 text-left text-xs tabular-nums text-[color:var(--cab-text-muted)]`}>{r.rank}</td>
                <td className={`${tdBase} min-w-0 font-medium`}>
                  <Tooltip content={r.cliente}><span className="line-clamp-2">
                    {r.cliente}
                  </span></Tooltip>
                </td>
                <td className={`${tdBase} text-right`}>
                  <ReportRankMetricCell value={r.interventi} max={maxInterventi} />
                </td>
                {showPctTotale ? (
                  <td className={`${tdBase} text-right text-xs tabular-nums text-[color:var(--cab-text-muted)]`}>
                    {totalInterventi > 0
                      ? `${((r.interventi / totalInterventi) * 100).toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`
                      : "—"}
                  </td>
                ) : null}
                <td className={`${tdBase} whitespace-nowrap text-right text-xs tabular-nums text-[color:color-mix(in_srgb,var(--cab-text-muted)_92%,var(--cab-text))]`}>
                  {r.ultimoIso ? new Date(r.ultimoIso).toLocaleDateString("it-IT") : "—"}
                </td>
                {showCompare ? (
                  <td className={`${tdBase} text-right text-xs tabular-nums text-[color:color-mix(in_srgb,var(--cab-text-muted)_92%,var(--cab-text))]`}>{fmtCmpLine(r.compare)}</td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {showPager ? <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} /> : null}
    </div>
  );
}
