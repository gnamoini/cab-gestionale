"use client";

import { memo } from "react";
import type { MultiSeriesLineChartSeries } from "@/components/report/design-system/primitives/chart/multi-series-line-chart";
import type { YearForecastLinePoint } from "@/lib/report/lavorazioni-year-matrix";
import type { KpiChartDisplayMode } from "@/lib/report/metrics/report-metric-types";
import {
  formatReportMetricValue,
  unitToReportFormatter,
  type ReportValueFormatter,
} from "@/lib/report/metrics/report-value-formatter";
import {
  capitalLineRows,
  categoricalBarRows,
  indexToChartDate,
  mergeMultiSeriesLineData,
  multiSeriesStroke,
  REPORT_BKLIT_CHART_CLASS,
  REPORT_BKLIT_CHART_MARGIN,
  temporalMonthlyBarRows,
  trendPointsToLineData,
  yearlyForecastLineChartData,
} from "@/lib/report/ui/bklit-adapters";
import { chartCssVars } from "@/src/components/charts/chart-context";
import { AreaChart } from "@/src/components/charts/area-chart";
import { Area } from "@/src/components/charts/area";
import { BarChart } from "@/src/components/charts/bar-chart";
import { Bar } from "@/src/components/charts/bar";
import { BarXAxis } from "@/src/components/charts/bar-x-axis";
import { BarYAxis } from "@/src/components/charts/bar-y-axis";
import { ComposedChart } from "@/src/components/charts/composed-chart";
import { SeriesBar } from "@/src/components/charts/series-bar";
import { FunnelChart } from "@/src/components/charts/funnel-chart";
import { Grid } from "@/src/components/charts/grid";
import { LineChart } from "@/src/components/charts/line-chart";
import { Line } from "@/src/components/charts/line";
import PieCenter from "@/src/components/charts/pie-center";
import PieChart from "@/src/components/charts/pie-chart";
import PieSlice from "@/src/components/charts/pie-slice";
import { ChartTooltip } from "@/src/components/charts/tooltip/chart-tooltip";
import { XAxis } from "@/src/components/charts/x-axis";
import { YAxis } from "@/src/components/charts/y-axis";

function ReportBklitCategoricalBarInner({
  rows,
  ariaLabel,
  valueDataKey = "value",
}: {
  rows: Record<string, unknown>[];
  ariaLabel?: string;
  valueDataKey?: string;
}) {
  if (rows.length === 0) return null;
  return (
    <div className={REPORT_BKLIT_CHART_CLASS} role="img" aria-label={ariaLabel}>
      <BarChart
        className="h-full w-full"
        data={rows}
        margin={REPORT_BKLIT_CHART_MARGIN}
        xDataKey="name"
      >
        <Grid horizontal strokeDasharray="4,4" />
        <Bar dataKey={valueDataKey} fill={chartCssVars.linePrimary} />
        <BarXAxis />
        <BarYAxis />
        <ChartTooltip />
      </BarChart>
    </div>
  );
}

export const ReportBklitCategoricalBar = memo(ReportBklitCategoricalBarInner);

export function ReportBklitTemporalMonthlyBars(props: {
  rows: { label: string; count: number; muted?: boolean }[];
  ariaLabel?: string;
  valueLabel?: string;
}) {
  return (
    <ReportBklitCategoricalBar
      rows={temporalMonthlyBarRows(props.rows)}
      ariaLabel={props.ariaLabel ?? "Grafico a barre"}
    />
  );
}

export function ReportBklitBarPoints(props: {
  points: { label: string; value: number; muted?: boolean }[];
  ariaLabel?: string;
}) {
  return (
    <ReportBklitCategoricalBar rows={categoricalBarRows(props.points)} ariaLabel={props.ariaLabel} />
  );
}

function ReportBklitTrendInner({
  points,
  useBars,
  formatValue,
  ariaLabel = "Trend nel periodo",
}: {
  points: { label: string; value: number; date?: string }[];
  useBars: boolean;
  formatValue: (value: number) => string;
  ariaLabel?: string;
}) {
  const data = trendPointsToLineData(points);
  if (data.length === 0) return null;

  if (useBars) {
    return (
      <div className={REPORT_BKLIT_CHART_CLASS} role="img" aria-label={ariaLabel}>
        <BarChart className="h-full w-full" data={data} margin={REPORT_BKLIT_CHART_MARGIN} xDataKey="name">
          <Grid horizontal strokeDasharray="4,4" />
          <Bar dataKey="value" fill={chartCssVars.linePrimary} />
          <BarXAxis />
          <BarYAxis />
          <ChartTooltip />
        </BarChart>
      </div>
    );
  }

  return (
    <div className={REPORT_BKLIT_CHART_CLASS} role="img" aria-label={ariaLabel}>
      <LineChart className="h-full w-full" data={data} margin={REPORT_BKLIT_CHART_MARGIN} xDataKey="date">
        <Grid horizontal strokeDasharray="4,4" />
        <Line dataKey="value" stroke={chartCssVars.linePrimary} showMarkers />
        <XAxis />
        <YAxis formatValue={formatValue} />
        <ChartTooltip />
      </LineChart>
    </div>
  );
}

export const ReportBklitTrend = memo(ReportBklitTrendInner);

function ReportBklitMultiSeriesInner({
  series,
  displayMode,
}: {
  series: MultiSeriesLineChartSeries[];
  displayMode: KpiChartDisplayMode;
}) {
  const data = mergeMultiSeriesLineData(series, displayMode);
  if (data.length === 0) {
    return <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun dato nel periodo selezionato.</p>;
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className={`${REPORT_BKLIT_CHART_CLASS} h-64`} role="img" aria-label="Grafico KPI multi-serie">
        <ComposedChart className="h-full w-full" data={data} margin={REPORT_BKLIT_CHART_MARGIN} xDataKey="date">
          <Grid horizontal strokeDasharray="4,4" />
          {series.map((s, i) => (
            <Line
              key={s.id}
              dataKey={s.id}
              stroke={multiSeriesStroke(i, s.color)}
              yAxisId={displayMode === "dual-axis" && s.axis === "right" ? "right" : "left"}
              showMarkers
            />
          ))}
          <XAxis />
          <YAxis yAxisId="left" />
          {displayMode === "dual-axis" ? <YAxis yAxisId="right" orientation="right" /> : null}
          <ChartTooltip />
        </ComposedChart>
      </div>
      <ul className="flex flex-nowrap gap-x-4 gap-y-1 text-sm text-[color:var(--cab-text)] sm:flex-wrap">
        {series.map((s, i) => (
          <li key={s.id} className="inline-flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: multiSeriesStroke(i, s.color) }}
              aria-hidden
            />
            <span>{s.label}</span>
            {displayMode === "dual-axis" ? (
              <span className="text-[color:var(--cab-text-muted)]">
                ({s.axis === "right" ? "asse destro" : "asse sinistro"})
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const ReportBklitMultiSeries = memo(ReportBklitMultiSeriesInner);

function ReportBklitYearlyForecastInner({
  solid,
  dashed,
  forecastYear,
  forecastYearEnd,
}: {
  solid: YearForecastLinePoint[];
  dashed: YearForecastLinePoint[];
  forecastYear: number;
  forecastYearEnd: number | null;
}) {
  const data = yearlyForecastLineChartData(solid, dashed);
  if (data.length === 0) return null;

  return (
    <div className={REPORT_BKLIT_CHART_CLASS} role="img" aria-label="Andamento annuale lavorazioni e previsione">
      <LineChart className="h-full w-full" data={data} margin={REPORT_BKLIT_CHART_MARGIN} xDataKey="date">
        <Grid horizontal strokeDasharray="4,4" />
        <Line dataKey="value" stroke={chartCssVars.lineSecondary} showMarkers />
        {dashed.length >= 2 ? (
          <Line dataKey="forecast" stroke={chartCssVars.linePrimary} strokeWidth={2.5} dashArray="7,5" showMarkers />
        ) : null}
        <XAxis />
        <YAxis />
        <ChartTooltip />
      </LineChart>
      <span className="sr-only">
        {`Anno ${forecastYear}${forecastYearEnd != null ? ` stima ${forecastYearEnd}` : ""}`}
      </span>
    </div>
  );
}

export const ReportBklitYearlyForecast = memo(ReportBklitYearlyForecastInner);

export function ReportBklitCapitalLine({ rows }: { rows: { label: string; capitaleFinale: number }[] }) {
  const data = capitalLineRows(rows);
  if (data.length === 0) return null;
  const fmt = (v: number) =>
    v.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  return (
    <div className={`${REPORT_BKLIT_CHART_CLASS} h-60`} role="img" aria-label="Andamento capitale immobilizzato">
      <AreaChart className="h-full w-full" data={data} margin={REPORT_BKLIT_CHART_MARGIN} xDataKey="date">
        <Grid horizontal strokeDasharray="4,4" />
        <Area dataKey="value" fill={chartCssVars.linePrimary} stroke={chartCssVars.linePrimary} />
        <XAxis />
        <YAxis formatValue={fmt} />
        <ChartTooltip />
      </AreaChart>
    </div>
  );
}

export function ReportBklitStackedEntrateUscite({
  rows,
  mode,
}: {
  rows: { label: string; entrate: number; uscite: number }[];
  mode: "stacked" | "grouped";
}) {
  const data = rows.map((r) => ({ name: r.label, entrate: r.entrate, uscite: r.uscite }));
  if (data.length === 0) return null;
  return (
    <div className={REPORT_BKLIT_CHART_CLASS} role="img" aria-label="Entrate e uscite">
      <BarChart
        className="h-full w-full"
        data={data}
        margin={REPORT_BKLIT_CHART_MARGIN}
        stacked={mode === "stacked"}
        xDataKey="name"
      >
        <Grid horizontal strokeDasharray="4,4" />
        <Bar dataKey="entrate" fill="var(--chart-2)" />
        <Bar dataKey="uscite" fill="var(--chart-1)" />
        <BarXAxis />
        <BarYAxis />
        <ChartTooltip />
      </BarChart>
    </div>
  );
}

export function ReportBklitFunnel({ stages }: { stages: { label: string; value: number }[] }) {
  if (stages.length === 0) return null;
  return (
    <div className={`${REPORT_BKLIT_CHART_CLASS} min-h-[14rem]`}>
      <FunnelChart className="h-full w-full" data={stages} color="var(--chart-1)" orientation="horizontal" />
    </div>
  );
}

export function ReportBklitDonut({
  slices,
  centerLabel = "Totale",
  ariaLabel,
}: {
  slices: { label: string; value: number; color?: string }[];
  centerLabel?: string;
  ariaLabel?: string;
}) {
  if (slices.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center" role="img" aria-label={ariaLabel}>
      <PieChart className="mx-auto h-44 w-44 shrink-0" data={slices} innerRadius={44} size={176}>
        {slices.map((_, index) => (
          <PieSlice key={index} index={index} />
        ))}
        <PieCenter defaultLabel={centerLabel} />
      </PieChart>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {slices.map((s, i) => {
          const total = slices.reduce((a, b) => a + b.value, 0);
          const pct = total > 0 ? Math.round((s.value / total) * 1000) / 10 : 0;
          return (
            <li key={s.label} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: s.color ?? `var(--chart-${(i % 5) + 1})` }}
                  aria-hidden
                />
                <span className="truncate text-[color:var(--cab-text)]">{s.label}</span>
              </span>
              <span className="shrink-0 tabular-nums text-[color:var(--cab-text-muted)]">
                {s.value} · {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ReportBklitWaterfallSteps({
  steps,
  ariaLabel,
}: {
  steps: { id: string; label: string; value: number; kind: string }[];
  ariaLabel?: string;
}) {
  const data = steps.map((s) => ({
    name: s.label,
    value: Math.abs(s.value),
    signed: s.value,
    kind: s.kind,
  }));
  if (data.length === 0) return null;
  return (
    <div className={REPORT_BKLIT_CHART_CLASS} role="img" aria-label={ariaLabel}>
      <BarChart className="h-full w-full" data={data} margin={REPORT_BKLIT_CHART_MARGIN} xDataKey="name">
        <Grid horizontal strokeDasharray="4,4" />
        <Bar dataKey="value" fill={chartCssVars.linePrimary} />
        <BarXAxis />
        <BarYAxis />
        <ChartTooltip />
      </BarChart>
    </div>
  );
}

export function ReportBklitParetoCombo({
  rows,
  barKey,
  lineKey,
  ariaLabel,
}: {
  rows: Record<string, unknown>[];
  barKey: string;
  lineKey: string;
  ariaLabel?: string;
}) {
  if (rows.length === 0) return null;
  const data = rows.map((row, i) => ({ ...row, date: indexToChartDate(i) }));
  return (
    <div className={REPORT_BKLIT_CHART_CLASS} role="img" aria-label={ariaLabel}>
      <ComposedChart className="h-full w-full" data={data} margin={REPORT_BKLIT_CHART_MARGIN} xDataKey="date">
        <Grid horizontal strokeDasharray="4,4" />
        <SeriesBar dataKey={barKey} fill={chartCssVars.lineSecondary} />
        <Line dataKey={lineKey} stroke={chartCssVars.linePrimary} yAxisId="right" showMarkers />
        <XAxis />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <ChartTooltip />
      </ComposedChart>
    </div>
  );
}

const AGING_BUCKETS = ["0-7", "8-14", "15-30", "30+"] as const;

export function ReportBklitAgingStacked({
  series,
  ariaLabel,
}: {
  series: readonly { label: string; values: Record<(typeof AGING_BUCKETS)[number], number> }[];
  ariaLabel?: string;
}) {
  const data = series.map((row) => ({
    name: row.label,
    ...row.values,
  }));
  if (data.length === 0) return null;
  return (
    <div className={`${REPORT_BKLIT_CHART_CLASS} h-64`} role="img" aria-label={ariaLabel}>
      <BarChart
        className="h-full w-full"
        data={data}
        margin={{ ...REPORT_BKLIT_CHART_MARGIN, left: 120 }}
        orientation="horizontal"
        stacked
        xDataKey="name"
      >
        <Grid horizontal={false} vertical strokeDasharray="4,4" />
        {AGING_BUCKETS.map((b, i) => (
          <Bar key={b} dataKey={b} fill={`var(--chart-${(i % 5) + 1})`} />
        ))}
        <BarXAxis />
        <BarYAxis />
        <ChartTooltip />
      </BarChart>
    </div>
  );
}

export function reportBklitFormatters(formatter: ReportValueFormatter): (v: number) => string {
  return (v) => formatReportMetricValue(v, formatter);
}

export { unitToReportFormatter };
