"use client";

import { useMemo, useState } from "react";
import { endOfLocalDay, startOfLocalDay, ymdFromDate } from "@/lib/report/date-ranges";

function addDaysLocal(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12, 0, 0, 0);
}
import { useReportAnalyticsQuery } from "@/components/report/analytics/hooks/use-report-analytics-query";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { listPrimaryTrendEligibleMetrics } from "@/components/report/analytics/resolve-series-eligible-metrics";
import { ReportAnalysisSectionShell } from "@/components/report/bi-center/report-analysis-section-shell";
import { ReportTrendChart } from "@/components/report/bi-center/report-trend-chart";
import type { ReportAnalyticsGranularity } from "@/lib/report/analytics-engine/types";
import {
  getReportBusinessLabel,
  getReportSectionCopy,
  HISTORICAL_DEFAULT_METRIC_IDS,
} from "@/lib/report/ui/report-business-labels";

type HistoricalWindow = "12w" | "12m";

function historicalRange(anchor: Date, window: HistoricalWindow) {
  const end = endOfLocalDay(anchor);
  const days = window === "12w" ? 7 * 12 - 1 : 365;
  const start = startOfLocalDay(addDaysLocal(end, -days));
  return { start, end };
}

/** Local historical view — does NOT mutate ReportPeriodContext. */
export function ReportHistoricalTrendContent() {
  const { anchor, compareMode, range: toolbarRange } = useReportPeriodContext();
  const [window, setWindow] = useState<HistoricalWindow>("12w");
  const [metricId, setMetricId] = useState<string>("lav-chiusi");
  const granularity: ReportAnalyticsGranularity = window === "12m" ? "month" : "week";

  const localRange = useMemo(() => historicalRange(anchor, window), [anchor, window]);
  const period = useMemo(
    () => ({
      preset: "custom" as const,
      start: ymdFromDate(localRange.start),
      end: ymdFromDate(localRange.end),
      compareMode: compareMode === "prev_period" || compareMode === "prev_year" ? compareMode : ("none" as const),
    }),
    [localRange, compareMode],
  );

  const eligible = useMemo(() => listPrimaryTrendEligibleMetrics(granularity), [granularity]);
  const selectorOptions = useMemo(() => {
    const preferred = HISTORICAL_DEFAULT_METRIC_IDS.filter((id) => eligible.includes(id)) as string[];
    const rest = eligible.filter((id) => !preferred.includes(id));
    return [...preferred, ...rest];
  }, [eligible]);
  const activeMetric = eligible.includes(metricId) ? metricId : (selectorOptions[0] ?? "eco_fatturato");

  const query = useReportAnalyticsQuery({
    period,
    metricIds: [activeMetric],
    includeSeries: true,
    granularity,
    enabled: Boolean(activeMetric),
  });

  const series = query.data?.series.find((s) => s.metricId === activeMetric);
  const toolbarLabel = `${ymdFromDate(toolbarRange.start)} → ${ymdFromDate(toolbarRange.end)}`;
  const businessLabel = getReportBusinessLabel(activeMetric);

  return (
    <>
      <p className="mb-3 text-xs text-[color:var(--cab-text-muted)]">
        Periodo toolbar: {toolbarLabel} · Storico: {period.start} → {period.end}
      </p>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-col gap-1 text-xs text-[color:var(--cab-text-muted)]">
          Metrica
          <select
            className="rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-2 py-1.5 text-sm"
            value={activeMetric}
            onChange={(e) => setMetricId(e.target.value)}
            aria-label="Metrica trend storico"
            data-testid="historical-trend-metric-select"
          >
            {selectorOptions.map((id) => (
              <option key={id} value={id}>
                {getReportBusinessLabel(id).title}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={`rounded-md border px-2 py-1 text-xs ${window === "12w" ? "border-[color:var(--cab-primary)]" : "border-[color:var(--cab-border)]"}`}
          onClick={() => setWindow("12w")}
        >
          12 settimane
        </button>
        <button
          type="button"
          className={`rounded-md border px-2 py-1 text-xs ${window === "12m" ? "border-[color:var(--cab-primary)]" : "border-[color:var(--cab-border)]"}`}
          onClick={() => setWindow("12m")}
        >
          12 mesi
        </button>
      </div>
      {query.isLoading ? (
        <div className="h-48 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />
      ) : (
        <>
          <p className="mb-2 text-sm font-medium text-[color:var(--cab-text)]">{businessLabel.title}</p>
          <ReportTrendChart
          series={series}
          metricId={activeMetric}
          granularity={granularity}
          embedded
          showTitle={false}
        />
        </>
      )}
    </>
  );
}

export function ReportHistoricalTrendSection() {
  const historicalCopy = getReportSectionCopy("historical");
  return (
    <ReportAnalysisSectionShell
      title={historicalCopy.title}
      subtitle={historicalCopy.subtitle}
      persistKey="bi-historical"
    >
      <ReportHistoricalTrendContent />
    </ReportAnalysisSectionShell>
  );
}
