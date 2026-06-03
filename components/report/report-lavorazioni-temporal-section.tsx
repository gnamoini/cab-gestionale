"use client";

import { Fragment, memo, useCallback, useMemo, useState } from "react";
import { GlobalSelect } from "@/components/gestionale/global-input";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { ShellCard } from "@/components/gestionale/shell-card";
import { ReportKpiCard } from "@/components/report/report-kpi-card";
import { ReportTemporalMonthlyBars } from "@/components/report/report-charts";
import { reportChartShellClass } from "@/components/report/report-ui-tokens";
import type { DateRange } from "@/lib/report/date-ranges";
import type { ReportSemanticIndex } from "@/lib/report/report-semantic-index";
import { yearsInReportRange } from "@/lib/report/report-temporal-filter";
import {
  dsScrollbar,
  dsTableRow,
  dsTableTd,
  dsTableWrap,
  dsTypoCaption,
  dsTypoSmall,
} from "@/lib/ui/design-system";
import { globalInputFieldFilter } from "@/lib/ui/global-input";
import { globalTableRow, globalTableWrap } from "@/lib/ui/global-table";

const MONTHS_SHORT = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"] as const;

function fmtPct(p: number | null): string {
  if (p == null) return "—";
  const s = p > 0 ? "+" : "";
  return `${s}${p.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
}

function heatTextClass(v: number, rowMax: number): string {
  if (rowMax <= 0 || v <= 0) return "text-[color:var(--cab-text-muted)]";
  const t = Math.min(1, v / rowMax);
  if (t > 0.85) return "font-semibold text-[color:var(--cab-primary)]";
  if (t > 0.65) return "font-medium text-[color:color-mix(in_srgb,var(--cab-primary)_82%,var(--cab-text))]";
  if (t > 0.45) return "text-[color:var(--cab-text)]";
  return "text-[color:var(--cab-text-muted)]";
}

function ReportLavorazioniTemporalSectionInner({
  filterRange,
  anchor,
  semanticIndex,
  embed = false,
  showKpiChart = true,
  showTable = true,
}: {
  filterRange: DateRange;
  anchor: Date;
  semanticIndex: ReportSemanticIndex;
  /** Senza ShellCard esterna (contenuto incorporato in altra zona). */
  embed?: boolean;
  showKpiChart?: boolean;
  showTable?: boolean;
}) {
  const years = useMemo(() => yearsInReportRange(filterRange), [filterRange]);
  const defaultYear = years.includes(anchor.getFullYear()) ? anchor.getFullYear() : (years[years.length - 1] ?? anchor.getFullYear());
  const [selYear, setSelYear] = useState(defaultYear);
  const [expandedMonthIndex, setExpandedMonthIndex] = useState<number | null>(null);

  const effectiveYear = years.includes(selYear) ? selYear : defaultYear;

  const model = useMemo(
    () => semanticIndex.buildTemporalModel(effectiveYear, filterRange),
    [semanticIndex, effectiveYear, filterRange],
  );

  const { monthMax, chartRows } = useMemo(() => {
    const activeCounts = model.months.filter((m) => m.inEffectiveRange).map((m) => m.count);
    const max = Math.max(1, ...activeCounts);
    const rows = model.months.map((m, i) => ({
      label: MONTHS_SHORT[i]!,
      count: m.count,
      muted: !m.inEffectiveRange,
    }));
    return { monthMax: max, chartRows: rows };
  }, [model.months]);

  const onYearChange = useCallback((value: string) => {
    setSelYear(Number(value));
    setExpandedMonthIndex(null);
  }, []);

  const { kpis } = model;

  const yearSelectId = embed ? "report-temporal-year-embed" : "report-temporal-year";

  const body = (
    <>
      <div className={`flex min-w-0 max-w-full flex-wrap items-end justify-between gap-3 ${showKpiChart || showTable ? "mb-4" : ""}`}>
        <div>
          <label htmlFor={yearSelectId} className={`mb-1 block ${dsTypoCaption}`}>
            Anno
          </label>
          <GlobalSelect
            id={yearSelectId}
            variant="filter"
            selectOnly
            inputClassName={`${globalInputFieldFilter} h-10 w-full min-w-[6rem]`}
            items={years.map((y) => ({ value: String(y), label: String(y) }))}
            value={String(effectiveYear)}
            onChange={onYearChange}
            strictFromList
          />
        </div>
        <p className={dsTypoSmall}>
          Totale anno: <span className="font-semibold tabular-nums">{kpis.total}</span> lavorazioni
        </p>
      </div>

      {showKpiChart ? (
      <>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReportKpiCard
          label="Media mensile"
          value={kpis.avgMonthly.toLocaleString("it-IT", { maximumFractionDigits: 1 })}
          sub={`su ${kpis.activeMonths} mesi attivi (${kpis.avgMonthlyCalendar.toLocaleString("it-IT", { maximumFractionDigits: 1 })} su 12)`}
          compareRows={null}
          compact
        />
        <ReportKpiCard
          label="Media settimanale"
          value={kpis.avgWeekly.toLocaleString("it-IT", { maximumFractionDigits: 1 })}
          sub={`su ${kpis.activeWeeks} settimane attive`}
          compareRows={null}
          compact
        />
        <ReportKpiCard
          label="Picco mensile"
          value={kpis.peakMonth ? String(kpis.peakMonth.count) : "—"}
          sub={kpis.peakMonth ? kpis.peakMonth.label : "Nessun dato nel periodo"}
          compareRows={null}
          compact
        />
        <ReportKpiCard
          label="Picco settimanale"
          value={kpis.peakWeek ? String(kpis.peakWeek.count) : "—"}
          sub={kpis.peakWeek ? kpis.peakWeek.label : "Nessun dato nel periodo"}
          compareRows={null}
          compact
        />
      </div>

      <div className={`mb-6 ${reportChartShellClass}`}>
        <ReportTemporalMonthlyBars rows={chartRows} />
      </div>
      </>
      ) : null}

      {showTable ? (
      <div className={`${globalTableWrap} ${dsTableWrap} ${dsScrollbar}`}>
        <table className="w-full min-w-[520px] border-collapse text-left">
          <GlobalTableHead>
            <GlobalTableHeadLabel label="Mese" />
            <GlobalTableHeadLabel label="Completate" />
            <GlobalTableHeadLabel label="Trend vs mese prec." />
            <GlobalTableHeadLabel
              label=""
              thClassName="w-10"
              scope="col"
              aria-label="Espandi settimane"
            />
          </GlobalTableHead>
          <tbody>
            {model.months.map((m) => {
              const expanded = expandedMonthIndex === m.monthIndex;
              const muted = !m.inEffectiveRange;
              return (
                <Fragment key={m.monthKey}>
                  <tr
                    className={`${globalTableRow} ${dsTableRow} ${muted ? "opacity-50" : ""} ${expanded ? "bg-[color:color-mix(in_srgb,var(--cab-surface-2)_65%,var(--cab-card))]" : ""} cursor-pointer`}
                    onClick={() => {
                      if (muted) return;
                      setExpandedMonthIndex(expanded ? null : m.monthIndex);
                    }}
                    title={muted ? "Mese fuori dal periodo selezionato" : "Clicca per dettaglio settimanale"}
                  >
                    <td className={dsTableTd}>
                      <span className="font-medium">{m.label}</span>
                      {m.hasManualOverride ? (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                          Storico manuale
                        </span>
                      ) : null}
                    </td>
                    <td className={`${dsTableTd} tabular-nums ${heatTextClass(m.count, monthMax)}`}>{m.count}</td>
                    <td className={`${dsTableTd} tabular-nums text-[color:var(--cab-text-muted)]`}>{fmtPct(m.trendVsPrevPct)}</td>
                    <td className={`${dsTableTd} text-center text-[color:var(--cab-text-muted)]`}>{expanded ? "▾" : muted ? "" : "▸"}</td>
                  </tr>
                  {expanded
                    ? m.weeks.map((w) => (
                        <tr key={`${m.monthKey}-w${w.weekIndex}`} className={`${globalTableRow} bg-[color:color-mix(in_srgb,var(--cab-surface-2)_45%,var(--cab-card))]`}>
                          <td className={`${dsTableTd} pl-8 text-sm text-[color:var(--cab-text-muted)]`} title={`${w.rangeStart} — ${w.rangeEnd}`}>
                            {w.label}
                          </td>
                          <td className={`${dsTableTd} tabular-nums text-sm`} title={m.hasManualOverride ? "Conteggio DB; il totale mese include lo storico manuale" : undefined}>
                            {m.hasManualOverride && w.count === 0 ? "—" : w.count}
                          </td>
                          <td className={dsTableTd} />
                          <td className={dsTableTd} />
                        </tr>
                      ))
                    : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      ) : null}
    </>
  );

  if (embed) return <div className="min-w-0">{body}</div>;

  return (
    <ShellCard
      id="report-lavorazioni-temporal"
      title="Analisi lavorazioni temporali"
      collapsible
      defaultCollapsed={false}
    >
      {body}
    </ShellCard>
  );
}

export const ReportLavorazioniTemporalSection = memo(ReportLavorazioniTemporalSectionInner);
