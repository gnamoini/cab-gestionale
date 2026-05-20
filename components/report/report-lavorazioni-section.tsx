"use client";

import { useMemo } from "react";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { ReportYearlyForecastLineChart } from "@/components/report/report-charts";
import type { ReportCompareDetail } from "@/lib/report/build-report-model";
import { deltaPct } from "@/lib/report/date-ranges";
import type { DateRange } from "@/lib/report/date-ranges";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";
import { buildLavorazioniYearMatrix, yearlyForecastLineModel, type LavorazioniYearRow } from "@/lib/report/lavorazioni-year-matrix";
import { dsSectionTitle, dsSurfaceCard, dsTableHead, dsTableWrap, dsScrollbar, dsTypoSmall } from "@/lib/ui/design-system";

const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"] as const;

function ymKey(y: number, m0: number): string {
  return `${y}-${String(m0 + 1).padStart(2, "0")}`;
}

function cellInFilter(y: number, m0: number, r: DateRange): boolean {
  const cellStart = startOfLocalDay(new Date(y, m0, 1));
  const cellEnd = endOfLocalDay(new Date(y, m0 + 1, 0));
  return cellStart.getTime() <= r.end.getTime() && cellEnd.getTime() >= r.start.getTime();
}

/** Intensità valore su sfondo nero uniforme (nessun bianco in cella). */
function heatTextClass(v: number, rowMax: number): string {
  if (rowMax <= 0 || v <= 0) return "text-zinc-500";
  const t = Math.min(1, v / rowMax);
  if (t > 0.85) return "text-orange-300 font-semibold";
  if (t > 0.65) return "text-orange-200/95";
  if (t > 0.45) return "text-zinc-200";
  return "text-zinc-400";
}

/** Scala colore e best/worst coerenti con il periodo selezionato (evita “celle a caso” al cambio range). */
function rowHeatMeta(row: LavorazioniYearRow, filterRange: DateRange) {
  const inMonths: { mi: number; v: number }[] = [];
  for (let mi = 0; mi < 12; mi += 1) {
    if (cellInFilter(row.year, mi, filterRange)) inMonths.push({ mi, v: row.months[mi] ?? 0 });
  }
  const pool = inMonths.length > 0 ? inMonths : row.months.map((v, mi) => ({ mi, v: v ?? 0 }));
  const rowMax = Math.max(1, ...pool.map((p) => p.v));
  let bestMi: number | null = null;
  let worstMi: number | null = null;
  let bestV = -1;
  let worstV = Number.POSITIVE_INFINITY;
  for (const { mi, v } of pool) {
    if (v > bestV) {
      bestV = v;
      bestMi = mi;
    }
    if (v < worstV) {
      worstV = v;
      worstMi = mi;
    }
  }
  if (bestV <= 0) bestMi = null;
  if (!Number.isFinite(worstV) || worstV === Number.POSITIVE_INFINITY) worstMi = null;
  if (bestMi !== null && worstMi !== null && bestMi === worstMi) worstMi = null;
  return { rowMax, bestMi, worstMi };
}

function fmtPct(p: number | null): string {
  if (p == null) return "—";
  const s = p > 0 ? "+" : "";
  return `${s}${p.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
}

export function ReportLavorazioniSection({
  attive,
  storico,
  anchor,
  filterRange,
  compareDetail,
}: {
  attive: LavorazioneAttiva[];
  storico: LavorazioneArchiviata[];
  anchor: Date;
  filterRange: DateRange;
  compareDetail: ReportCompareDetail | null;
}) {
  const { rows, monthLabels, hasAnyData } = useMemo(
    () => buildLavorazioniYearMatrix(storico, anchor),
    [storico, anchor],
  );
  const forecast = useMemo(() => yearlyForecastLineModel(rows, anchor), [rows, anchor]);

  const heatByYear = useMemo(() => {
    const m = new Map<number, ReturnType<typeof rowHeatMeta>>();
    for (const row of rows) m.set(row.year, rowHeatMeta(row, filterRange));
    return m;
  }, [rows, filterRange]);

  const inCorsoCount = attive.length;
  const archiviateCount = storico.length;

  const cmpLine =
    compareDetail != null ? (
      <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-200">
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">Confronto periodo</span>
        {" · "}
        Archiviate nel periodo: {compareDetail.completedCur} vs {compareDetail.completedPrev} (
        {fmtPct(deltaPct(compareDetail.completedCur, compareDetail.completedPrev))}
        {compareDetail.completedCur - compareDetail.completedPrev !== 0 ? (
          <span className="tabular-nums">
            {" "}
            · Δ ass. {compareDetail.completedCur - compareDetail.completedPrev > 0 ? "+" : ""}
            {compareDetail.completedCur - compareDetail.completedPrev}
          </span>
        ) : null}
        ) — Ingressi: {compareDetail.openedCur} vs {compareDetail.openedPrev} (
        {fmtPct(deltaPct(compareDetail.openedCur, compareDetail.openedPrev))})
      </div>
    ) : null;

  return (
    <div className={`${dsSurfaceCard} p-4`}>
      <div className="mb-4">
        <h2 className={dsSectionTitle}>Andamento lavorazioni</h2>
        <p className={dsTypoSmall}>
          Solo lavorazioni reali (escluse eliminate):{" "}
          <span className="font-medium">{inCorsoCount}</span> in corso,{" "}
          <span className="font-medium">{archiviateCount}</span> archiviate. Chiusure mensili = lavorazioni
          archiviate per data di conclusione.
        </p>
      </div>

      {cmpLine}

      {!hasAnyData ? (
        <p className="mb-4 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
          Nessun dato disponibile: non risultano lavorazioni archiviate con data di chiusura. Le lavorazioni in corso
          contribuiscono agli ingressi ma non alle chiusure mensili finché non vengono concluse.
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.55fr)]">
        <div className="min-w-0">
          <div className={`${dsTableWrap} ${dsScrollbar} overflow-hidden rounded-[var(--ds-radius-xl)] border border-zinc-800 bg-black`}>
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className={`sticky top-0 z-10 ${dsTableHead}`}>
                <tr className="h-14">
                  <th
                    scope="col"
                    className="min-w-[3.5rem] border-b border-[color:var(--cab-border)] px-2 py-2 text-center align-middle text-[10px] font-bold uppercase tracking-wide sm:text-xs"
                  >
                    Anno
                  </th>
                  {monthLabels.map((lab, mi) => (
                    <th
                      key={`h-${mi}-${lab}`}
                      scope="col"
                      title={lab}
                      className="min-w-[2.5rem] border-b border-[color:var(--cab-border)] px-1 py-2 text-center align-middle text-[10px] font-bold uppercase tracking-wide sm:text-xs"
                    >
                      {lab}
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="min-w-[3.5rem] border-b border-[color:var(--cab-border)] px-2 py-2 text-center align-middle text-[10px] font-bold uppercase tracking-wide sm:text-xs"
                  >
                    Totale
                  </th>
                  <th
                    scope="col"
                    title="Variazione percentuale rispetto all'anno precedente"
                    className="min-w-[3.5rem] border-b border-[color:var(--cab-border)] px-2 py-2 text-center align-middle text-[10px] font-bold uppercase tracking-wide sm:text-xs"
                  >
                    Vs prec.
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const hm = heatByYear.get(row.year)!;
                  return (
                    <tr key={row.year} className="h-12 border-b border-zinc-800/90 transition-colors hover:bg-zinc-950">
                      <td className="border-r border-zinc-800 bg-black px-2 py-2 text-center align-middle text-sm font-semibold tabular-nums text-zinc-100">
                        {row.year}
                      </td>
                      {row.months.map((v, mi) => {
                        const inF = cellInFilter(row.year, mi, filterRange);
                        const heatTxt = heatTextClass(v, hm.rowMax);
                        const isBest = inF && hm.bestMi === mi && v > 0;
                        const isWorst = inF && hm.worstMi === mi && v > 0 && hm.worstMi !== hm.bestMi;
                        return (
                          <td
                            key={`${row.year}-${mi}`}
                            className={`border-r border-zinc-800 bg-black px-0.5 py-2 text-center align-middle text-sm tabular-nums leading-tight ${heatTxt} ${
                              isBest ? "ring-1 ring-inset ring-emerald-500/55" : ""
                            } ${isWorst ? "ring-1 ring-inset ring-rose-500/50" : ""}`}
                            title={`${ymKey(row.year, mi)}: ${v}`}
                          >
                            <span className={inF ? "" : "opacity-40"}>{v > 0 ? v : "—"}</span>
                          </td>
                        );
                      })}
                      <td className="border-l border-zinc-800 bg-black px-2 py-2 text-center align-middle text-sm font-semibold tabular-nums text-orange-200">
                        {row.total}
                      </td>
                      <td className="border-l border-zinc-800 bg-black px-2 py-2 text-center align-middle text-sm font-semibold tabular-nums text-orange-200">
                        {row.growthVsPrevPct == null ? "—" : `${row.growthVsPrevPct > 0 ? "+" : ""}${row.growthVsPrevPct}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Andamento annuale e previsione</p>
          {forecast.solid.length === 0 ? (
            <p className="text-sm text-zinc-500">Nessun dato disponibile per il grafico.</p>
          ) : (
            <>
              <ReportYearlyForecastLineChart
                solid={forecast.solid}
                dashed={forecast.dashed}
                forecastYear={forecast.forecastYear}
                forecastYearEnd={forecast.forecastYearEnd}
              />
              <ul className="mt-3 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                <li>
                  <span className="inline-block h-0.5 w-6 rounded-full bg-sky-500 align-middle" /> Storico annuale
                  (archiviate)
                </li>
                <li>
                  <span className="inline-block h-0.5 w-6 rounded-full bg-sky-500 align-middle" /> Anno in corso (YTD)
                </li>
                <li>
                  <span
                    className="inline-block h-0.5 w-6 rounded-full bg-orange-500 align-middle"
                    style={{ borderStyle: "dashed" }}
                  />{" "}
                  Previsione fine anno (regressione pesata + ritmo corrente)
                </li>
              </ul>
              <p className="mt-2 text-xs text-zinc-500">
                YTD {anchor.getFullYear()}: <span className="font-semibold text-zinc-800 dark:text-zinc-100">{forecast.ytd}</span>
                {forecast.forecastYearEnd != null ? (
                  <>
                    {" "}
                    — Stima fine anno:{" "}
                    <span className="font-semibold text-zinc-800 dark:text-zinc-100">{forecast.forecastYearEnd}</span>
                  </>
                ) : null}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
