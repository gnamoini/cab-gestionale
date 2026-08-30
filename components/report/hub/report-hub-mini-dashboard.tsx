"use client";

import { useMemo } from "react";
import { LoadingErrorState } from "@/components/design-system";
import { SkeletonBlock } from "@/components/design-system/loading/skeleton-primitives";
import { GlobalDatePickerYmd } from "@/components/gestionale/global-input";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { ReportSectionHeader } from "@/components/report/design-system/typography/report-typography-components";
import {
  reportTypographyDescriptionClass,
  reportTypographyValueClass,
} from "@/components/report/design-system/typography/report-typography";
import { useReportAnalyticsQuery } from "@/components/report/analytics/hooks/use-report-analytics-query";
import { buildAnalyticsPeriodFromContext } from "@/components/report/analytics/report-period-to-analytics";
import {
  reportArrowAndTone,
  reportCompareToneClass,
  reportMetricCardCompactClass,
} from "@/components/report/report-ui-tokens";
import {
  buildHubSummary,
  HUB_SUMMARY_METRIC_IDS,
  type HubSummaryKpi,
} from "@/lib/report/hub/build-hub-summary";
import { formatReportDeltaPercent, formatReportPeriodLabel } from "@/lib/report/ui/report-number-format";
import { ymdFromDate, type ReportPeriodPreset } from "@/lib/report/date-ranges";
import { REPORT_PRESET_LABELS } from "@/lib/report/report-period-presets";
import {
  dsFocus,
  dsSegmentedBtnOff,
  dsSegmentedBtnOn,
  dsSegmentedWrap,
} from "@/lib/ui/design-system";
import { GLOBAL_DATE_PICKER_CALENDAR_PANEL_WIDTH, globalInputFieldFilter } from "@/lib/ui/global-input";

const HUB_PERIOD_CHIPS: readonly ReportPeriodPreset[] = [
  "last_30_days",
  "last_3_months",
  "ytd",
  "custom",
];

const kpiGridClass = "grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7";

function periodChipClass(active: boolean): string {
  return `inline-flex h-8 shrink-0 items-center justify-center rounded-[var(--ds-radius-lg)] px-2.5 text-xs font-medium !py-0 sm:px-3 sm:text-sm ${
    active ? dsSegmentedBtnOn : dsSegmentedBtnOff
  } ${dsFocus}`;
}

function HubSummaryKpiCard({ kpi }: { kpi: HubSummaryKpi }) {
  const deltaLabel = formatReportDeltaPercent(kpi.deltaPercent);
  const { arrow, tone } = reportArrowAndTone(kpi.deltaPercent, kpi.invertTrend);
  const toneClass = reportCompareToneClass(tone);

  return (
    <article className={reportMetricCardCompactClass} data-testid={`report-hub-kpi-${kpi.id}`}>
      <p className={`${reportTypographyValueClass} text-xl sm:text-2xl`}>{kpi.formatted}</p>
      <p className={reportTypographyDescriptionClass}>{kpi.label}</p>
      {deltaLabel ? (
        <p className={`mt-1 text-[11px] font-semibold tabular-nums ${toneClass}`}>
          <span className="sr-only">
            {kpi.deltaPercent != null && kpi.deltaPercent > 0
              ? "in aumento"
              : kpi.deltaPercent != null && kpi.deltaPercent < 0
                ? "in diminuzione"
                : "invariato"}
          </span>
          <span aria-hidden className="mr-0.5">
            {arrow}
          </span>
          {deltaLabel} vs periodo precedente
        </p>
      ) : null}
    </article>
  );
}

function HubKpiSkeleton() {
  return (
    <div className={kpiGridClass} aria-hidden>
      {Array.from({ length: 7 }).map((_, i) => (
        <SkeletonBlock key={i} minHeightClass="min-h-[5.5rem]" className="w-full" />
      ))}
    </div>
  );
}

function HubPeriodChips() {
  const {
    preset,
    setPreset,
    customFrom,
    customTo,
    setCustomFrom,
    setCustomTo,
    range,
  } = useReportPeriodContext();

  const known = (HUB_PERIOD_CHIPS as readonly string[]).includes(preset);
  const analysisFrom = preset === "custom" ? customFrom : ymdFromDate(range.start);
  const analysisTo = preset === "custom" ? customTo : ymdFromDate(range.end);

  return (
    <div className="min-w-0 space-y-2">
      <div className={`${dsSegmentedWrap} min-w-0 items-center`} role="group" aria-label="Periodo di analisi">
        {!known ? (
          <span className={periodChipClass(true)}>{REPORT_PRESET_LABELS[preset]}</span>
        ) : null}
        {HUB_PERIOD_CHIPS.map((id) => (
          <button
            key={id}
            type="button"
            className={periodChipClass(preset === id)}
            aria-pressed={preset === id}
            onClick={() => setPreset(id)}
          >
            {REPORT_PRESET_LABELS[id]}
          </button>
        ))}
      </div>
      {preset === "custom" ? (
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-xs text-[color:var(--cab-text-muted)]">Dal</span>
            <GlobalDatePickerYmd
              id="report-hub-period-from"
              valueYmd={analysisFrom}
              onChangeYmd={(ymd) => setCustomFrom(ymd)}
              inputClassName={`${globalInputFieldFilter} h-10 w-full min-w-0`}
              calendarPanelWidth={GLOBAL_DATE_PICKER_CALENDAR_PANEL_WIDTH}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-xs text-[color:var(--cab-text-muted)]">Al</span>
            <GlobalDatePickerYmd
              id="report-hub-period-to"
              valueYmd={analysisTo}
              onChangeYmd={(ymd) => setCustomTo(ymd)}
              inputClassName={`${globalInputFieldFilter} h-10 w-full min-w-0`}
              calendarPanelWidth={GLOBAL_DATE_PICKER_CALENDAR_PANEL_WIDTH}
            />
          </label>
        </div>
      ) : (
        <p className="text-[11px] tabular-nums text-[color:var(--cab-text-muted)]">
          {formatReportPeriodLabel(ymdFromDate(range.start), ymdFromDate(range.end))}
        </p>
      )}
    </div>
  );
}

export function ReportHubMiniDashboard() {
  const { range, compareMode } = useReportPeriodContext();
  const period = useMemo(() => {
    const base = buildAnalyticsPeriodFromContext({ range, compareMode });
    return {
      ...base,
      compareMode: base.compareMode === "none" ? ("prev_period" as const) : base.compareMode,
    };
  }, [range, compareMode]);

  const query = useReportAnalyticsQuery({
    period,
    metricIds: HUB_SUMMARY_METRIC_IDS,
  });

  const kpis = useMemo(() => {
    const map = new Map((query.data?.metrics ?? []).map((env) => [env.metricId, env]));
    return buildHubSummary(map);
  }, [query.data?.metrics]);

  const allEmpty = !query.isLoading && !query.isError && kpis.every((k) => k.value == null);

  return (
    <section
      className="min-w-0 space-y-3"
      data-testid="report-hub-mini-dashboard"
      aria-label="Come stiamo andando?"
    >
      <ReportSectionHeader
        title="Come stiamo andando?"
        subtitle="Sintesi del periodo. I dettagli sono nelle aree sotto."
      />
      <HubPeriodChips />
      {query.isLoading ? (
        <div role="status" aria-label="Caricamento sintesi">
          <HubKpiSkeleton />
        </div>
      ) : query.isError ? (
        <LoadingErrorState
          title="Sintesi non disponibile"
          description={query.error instanceof Error ? query.error.message : "Impossibile caricare i dati."}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <div className={kpiGridClass}>
            {kpis.map((kpi) => (
              <HubSummaryKpiCard key={kpi.id} kpi={kpi} />
            ))}
          </div>
          {allEmpty ? (
            <p className="text-xs text-[color:var(--cab-text-muted)]">Nessun dato nel periodo selezionato.</p>
          ) : null}
        </>
      )}
    </section>
  );
}
