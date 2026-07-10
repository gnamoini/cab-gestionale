"use client";

import { Tooltip } from "@/components/ui";
import { useEffect, useMemo, useState } from "react";
import { GlobalSelect } from "@/components/gestionale/global-input";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { ShellCard } from "@/components/gestionale/shell-card";
import { TablePagination } from "@/components/gestionale/table-pagination";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import {
  buildRicambiConsumoRanking,
  buildConsumoMapMagazzinoRolling36ForProducts,
  formatAvgMonthlyMagazzinoIt,
  intersectDateRanges,
  monthBoundsLocal,
  yearBoundsLocal,
} from "@/lib/magazzino/ricambio-consumo-from-log";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { DateRange } from "@/lib/report/date-ranges";
import { rangeToYmKeys } from "@/lib/report/magazzino-monthly-rows";
import { yearsInReportRange } from "@/lib/report/report-temporal-filter";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import {
  dsSegmentedBtnOff,
  dsSegmentedBtnOn,
  dsSegmentedWrap,
  dsScrollbar,
  dsTableEmptyCell,
  dsTableRow,
  dsTableTd,
  dsTableWrap,
} from "@/lib/ui/design-system";
import { globalInputFieldFilter } from "@/lib/ui/global-input";

const ricambiTableWrap = `${dsTableWrap} ${dsScrollbar}`;
const ricambiTbodyTr = dsTableRow;
const ricambiTd = dsTableTd;
/** Colonna indice: allineata a sinistra, larghezza minima come le altre tabelle report. */
type VistaMode = "periodo" | "mese" | "anno";

function parseYm(k: string): { y: number; m: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(k);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) };
}

function fmtYmHuman(k: string): string {
  const p = parseYm(k);
  if (!p) return k;
  return new Date(p.y, p.m - 1, 1).toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}

export function ReportRicambiConsumoSection({
  magLogSorted,
  prodotti,
  filterRange,
  anchor,
  embed = false,
}: {
  /** Log magazzino ordinato — stessa fonte di KPI/sezione magazzino (`derivedBundle.magLogSorted`). */
  magLogSorted: MagazzinoChangeLogEntry[];
  prodotti: RicambioMagazzino[];
  filterRange: DateRange;
  anchor: Date;
  embed?: boolean;
}) {
  const monthKeys = useMemo(() => rangeToYmKeys(filterRange), [filterRange]);
  const years = useMemo(() => yearsInReportRange(filterRange), [filterRange]);

  const [vista, setVista] = useState<VistaMode>("periodo");
  const [selMonthKey, setSelMonthKey] = useState<string>("");
  const [selYear, setSelYear] = useState(() => filterRange.end.getFullYear());

  const effectiveMonthKey = useMemo(() => {
    if (monthKeys.length === 0) return "";
    if (selMonthKey && monthKeys.includes(selMonthKey)) return selMonthKey;
    return monthKeys[monthKeys.length - 1]!;
  }, [monthKeys, selMonthKey]);

  const effectiveYear = useMemo(() => {
    const y = filterRange.end.getFullYear();
    if (years.length === 0) return y;
    if (years.includes(selYear)) return selYear;
    if (years.includes(y)) return y;
    return years[years.length - 1]!;
  }, [filterRange, years, selYear]);

  const effectiveRange = useMemo((): DateRange => {
    if (vista === "periodo") return filterRange;
    if (vista === "mese") {
      const p = parseYm(effectiveMonthKey);
      if (!p) return filterRange;
      const mBound = monthBoundsLocal(p.y, p.m);
      return intersectDateRanges(filterRange, mBound) ?? filterRange;
    }
    const yBound = yearBoundsLocal(effectiveYear);
    return intersectDateRanges(filterRange, yBound) ?? filterRange;
  }, [vista, filterRange, effectiveMonthKey, effectiveYear]);

  const ranking = useMemo(
    () => buildRicambiConsumoRanking(magLogSorted, prodotti, effectiveRange, { limit: 200 }),
    [magLogSorted, prodotti, effectiveRange],
  );

  const listPageSize = useResponsiveListPageSize();
  const rankingPagerDeps = useMemo(
    () =>
      `${effectiveRange.start.getTime()}|${effectiveRange.end.getTime()}|${vista}|${effectiveMonthKey}|${effectiveYear}|${ranking.length}`,
    [effectiveRange.start, effectiveRange.end, vista, effectiveMonthKey, effectiveYear, ranking.length],
  );
  const {
    page: rankingPage,
    setPage: setRankingPage,
    pageCount: rankingPageCount,
    sliceItems: sliceRankingPage,
    showPager: showRankingPager,
    label: rankingPagerLabel,
    resetPage: resetRankingPage,
  } = useClientPagination(ranking.length, listPageSize);
  useEffect(() => {
    resetRankingPage();
  }, [rankingPagerDeps, listPageSize, resetRankingPage]);
  const rankingPaged = useMemo(() => sliceRankingPage(ranking), [ranking, sliceRankingPage]);

  const rollingConsumoMap = useMemo(
    () => buildConsumoMapMagazzinoRolling36ForProducts(magLogSorted, prodotti, anchor),
    [magLogSorted, prodotti, anchor],
  );

  const hasLog = magLogSorted.length > 0;

  const panel = (
    <>
      <div className="flex min-w-0 max-w-full flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Aggregazione</span>
          <div className={dsSegmentedWrap}>
            {(
              [
                ["periodo", "Intero periodo filtro"],
                ["mese", "Per mese"],
                ["anno", "Per anno"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={vista === id}
                onClick={() => setVista(id)}
                className={vista === id ? dsSegmentedBtnOn : dsSegmentedBtnOff}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {vista === "mese" ? (
          <div className="w-full min-w-[12rem] lg:w-auto">
            <label htmlFor="report-ricambi-mese" className="text-xs font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
              Mese (nel periodo)
            </label>
            <GlobalSelect
              id="report-ricambi-mese"
              variant="filter"
              selectOnly
              disabled={monthKeys.length === 0}
              inputClassName={`${globalInputFieldFilter} mt-1 h-10 w-full`}
              items={monthKeys.map((k) => ({ value: k, label: fmtYmHuman(k) }))}
              value={effectiveMonthKey}
              onChange={setSelMonthKey}
              strictFromList
            />
          </div>
        ) : null}

        {vista === "anno" ? (
          <div className="w-full min-w-[8rem] lg:w-auto">
            <label htmlFor="report-ricambi-anno" className="text-xs font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
              Anno (nel periodo)
            </label>
            <GlobalSelect
              id="report-ricambi-anno"
              variant="filter"
              selectOnly
              disabled={years.length === 0}
              inputClassName={`${globalInputFieldFilter} mt-1 h-10 w-full`}
              items={years.map((y) => ({ value: String(y), label: String(y) }))}
              value={String(effectiveYear)}
              onChange={(v) => setSelYear(Number(v))}
              strictFromList
            />
          </div>
        ) : null}
      </div>

      {!hasLog ? (
        <p className="mt-4 text-sm text-[color:var(--cab-text-muted)]">
          Dati insufficienti: non è presente uno storico movimenti magazzino. I consumi si popolano quando registrate
          variazioni di scorta nei log.
        </p>
      ) : (
        <>
          <div className="mt-6">
            <div className={ricambiTableWrap}>
              <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-0 text-left text-sm">
                <colgroup>
                  <col className="w-6 min-w-[1.5rem] max-w-[1.75rem]" />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "12%" }} />
                  <col />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "13%" }} />
                </colgroup>
                <GlobalTableHead>
                  <GlobalTableHeadLabel label="Pos." thClassName="w-6 min-w-[1.5rem] max-w-[1.75rem] px-0.5 text-center" align="center" />
                  <GlobalTableHeadLabel label="Codice" />
                  <GlobalTableHeadLabel label="Marca" />
                  <GlobalTableHeadLabel label="Descrizione" />
                  <GlobalTableHeadLabel label="Consumo medio" align="right" />
                  <GlobalTableHeadLabel label="Totale consumo" align="right" />
                </GlobalTableHead>
                <tbody>
                  {ranking.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={dsTableEmptyCell}>
                        Nessuno scarico nel periodo selezionato.
                      </td>
                    </tr>
                  ) : (
                    rankingPaged.map((r) => (
                      <tr key={r.id} className={ricambiTbodyTr}>
                        <td className={`${ricambiTd} px-1.5 text-left text-xs tabular-nums text-[color:var(--cab-text-muted)]`}>
                          {r.rank}
                        </td>
                        <td className={`${ricambiTd} whitespace-nowrap font-mono text-xs font-semibold tracking-wide`}>{r.codice}</td>
                        <Tooltip content={r.marca}><td className={`${ricambiTd} max-w-0 truncate text-xs`}>
                          {r.marca}
                        </td></Tooltip>
                        <td className={`${ricambiTd} min-w-0`}>
                          <Tooltip content={r.nome}><div className="truncate font-medium">
                            {r.nome}
                          </div></Tooltip>
                        </td>
                        <td className={`${ricambiTd} text-right font-semibold tabular-nums`}>
                          {formatAvgMonthlyMagazzinoIt(rollingConsumoMap.get(r.id)?.avgMonthly ?? null)}
                        </td>
                        <td className={`${ricambiTd} text-right tabular-nums`}>
                          {r.totalUscite.toLocaleString("it-IT")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {showRankingPager ? (
              <TablePagination
                page={rankingPage}
                pageCount={rankingPageCount}
                onPageChange={setRankingPage}
                label={rankingPagerLabel}
                className="mt-2 rounded-lg border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_50%,var(--cab-card))] px-2"
              />
            ) : null}
          </div>
        </>
      )}
    </>
  );

  if (embed) return <div className="min-w-0">{panel}</div>;

  return (
    <ShellCard
      id="report-magazzino-consumo"
      title="Ricambi a maggior consumo"
      collapsible
      defaultCollapsed={false}
      persistScope="report"
      persistKey="magazzino-consumo"
    >
      {panel}
    </ShellCard>
  );
}
