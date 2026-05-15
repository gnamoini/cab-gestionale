"use client";

import { useEffect, useMemo, useState } from "react";
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
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import {
  dsSegmentedBtnOff,
  dsSegmentedBtnOn,
  dsSegmentedWrap,
  dsScrollbar,
  dsTableEmptyCell,
  dsTableHeadCell,
  dsTableRow,
  dsTableTd,
  dsTableThPos,
  dsTableWrap,
  gestionaleSelectNativePlainClass,
} from "@/lib/ui/design-system";

const ricambiTableWrap = `${dsTableWrap} ${dsScrollbar}`;
const ricambiTbodyTr = dsTableRow;
const ricambiTd = dsTableTd;
/** Colonna indice: allineata a sinistra, larghezza minima come le altre tabelle report. */
const ricambiThPos = `${dsTableThPos} text-left pl-1.5 pr-0.5`;

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

function fmtRangeLine(r: DateRange): string {
  const o = { day: "2-digit" as const, month: "short" as const, year: "numeric" as const };
  return `${r.start.toLocaleDateString("it-IT", o)} — ${r.end.toLocaleDateString("it-IT", o)}`;
}

function yearsInRange(r: DateRange): number[] {
  const y0 = r.start.getFullYear();
  const y1 = r.end.getFullYear();
  const out: number[] = [];
  for (let y = y0; y <= y1; y++) out.push(y);
  return out;
}

export function ReportRicambiConsumoSection({
  magLog,
  prodotti,
  filterRange,
  anchor,
}: {
  magLog: MagazzinoChangeLogEntry[];
  prodotti: RicambioMagazzino[];
  filterRange: DateRange;
  anchor: Date;
}) {
  const monthKeys = useMemo(() => rangeToYmKeys(filterRange), [filterRange]);
  const years = useMemo(() => yearsInRange(filterRange), [filterRange]);

  const [vista, setVista] = useState<VistaMode>("periodo");
  const [selMonthKey, setSelMonthKey] = useState<string>("");
  const [selYear, setSelYear] = useState(() => filterRange.end.getFullYear());

  useEffect(() => {
    if (monthKeys.length > 0) {
      setSelMonthKey((cur) => (cur && monthKeys.includes(cur) ? cur : monthKeys[monthKeys.length - 1]!));
    } else {
      setSelMonthKey("");
    }
  }, [monthKeys]);

  useEffect(() => {
    const y = filterRange.end.getFullYear();
    setSelYear((cur) => {
      if (years.length === 0) return y;
      if (years.includes(cur)) return cur;
      if (years.includes(y)) return y;
      return years[years.length - 1]!;
    });
  }, [filterRange, years]);

  const effectiveRange = useMemo((): DateRange => {
    if (vista === "periodo") return filterRange;
    if (vista === "mese") {
      const p = parseYm(selMonthKey);
      if (!p) return filterRange;
      const mBound = monthBoundsLocal(p.y, p.m);
      return intersectDateRanges(filterRange, mBound) ?? filterRange;
    }
    const yBound = yearBoundsLocal(selYear);
    return intersectDateRanges(filterRange, yBound) ?? filterRange;
  }, [vista, filterRange, selMonthKey, selYear]);

  const ranking = useMemo(
    () => buildRicambiConsumoRanking(magLog, prodotti, effectiveRange, { limit: 200 }),
    [magLog, prodotti, effectiveRange],
  );

  const listPageSize = useResponsiveListPageSize();
  const rankingPagerDeps = useMemo(
    () =>
      `${effectiveRange.start.getTime()}|${effectiveRange.end.getTime()}|${vista}|${selMonthKey}|${selYear}|${ranking.length}`,
    [effectiveRange.start, effectiveRange.end, vista, selMonthKey, selYear, ranking.length],
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
    () => buildConsumoMapMagazzinoRolling36ForProducts(magLog, prodotti, anchor),
    [magLog, prodotti, anchor],
  );

  const hasLog = magLog.length > 0;

  return (
    <ShellCard
      title="Ricambi a maggior consumo"
      subtitle="Consumo medio mensile: stesso indicatore della pagina Magazzino (ultimi 36 mesi, 2 decimali). «Totale consumo» e la classifica per posizione si riferiscono alle uscite nel periodo / vista selezionata."
    >
      <p className="mb-4 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
        Periodo del report: <span className="font-medium text-zinc-800 dark:text-zinc-200">{fmtRangeLine(filterRange)}</span>.
        Con le viste «Per mese» o «Per anno» la colonna uscite si limita al sotto-intervallo scelto (sempre contenuto nel filtro globale). Vista
        attiva: <span className="font-medium text-zinc-800 dark:text-zinc-200">{fmtRangeLine(effectiveRange)}</span>.
      </p>
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Aggregazione</span>
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
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Mese (nel periodo)</label>
            <select
              value={selMonthKey}
              onChange={(e) => setSelMonthKey(e.target.value)}
              className={`${gestionaleSelectNativePlainClass} mt-1 block h-10 w-full py-0`}
              disabled={monthKeys.length === 0}
            >
              {monthKeys.map((k) => (
                <option key={k} value={k}>
                  {fmtYmHuman(k)}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {vista === "anno" ? (
          <div className="w-full min-w-[8rem] lg:w-auto">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Anno (nel periodo)</label>
            <select
              value={String(selYear)}
              onChange={(e) => setSelYear(Number(e.target.value))}
              className={`${gestionaleSelectNativePlainClass} mt-1 block h-10 w-full py-0`}
              disabled={years.length === 0}
            >
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {!hasLog ? (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
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
                <thead>
                  <tr>
                    <th scope="col" className={ricambiThPos}>
                      Pos.
                    </th>
                    <th scope="col" className={dsTableHeadCell}>
                      Codice
                    </th>
                    <th scope="col" className={dsTableHeadCell}>
                      Marca
                    </th>
                    <th scope="col" className={dsTableHeadCell}>
                      Descrizione
                    </th>
                    <th scope="col" className={`${dsTableHeadCell} text-right`}>
                      Consumo medio
                    </th>
                    <th scope="col" className={`${dsTableHeadCell} text-right`}>
                      Totale consumo
                    </th>
                  </tr>
                </thead>
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
                        <td className={`${ricambiTd} max-w-0 truncate text-xs`} title={r.marca}>
                          {r.marca}
                        </td>
                        <td className={`${ricambiTd} min-w-0`}>
                          <div className="truncate font-medium" title={r.nome}>
                            {r.nome}
                          </div>
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
                className="mt-2 rounded-lg border border-zinc-100 bg-zinc-50/50 px-2 dark:border-zinc-800 dark:bg-zinc-900/30"
              />
            ) : null}
          </div>
        </>
      )}
    </ShellCard>
  );
}
