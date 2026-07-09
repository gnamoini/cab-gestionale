"use client";

import { ReportSparkline } from "@/components/report/report-sparkline";
import { ReportMetricCompareSection } from "@/components/report/report-metric-compare-section";
import { formatReportMetricValue } from "@/lib/report/metrics/format-report-metric-value";
import type { ReportMetric, ReportMetricRegistryEntry } from "@/lib/report/metrics/report-metric-types";
import {
  reportKpiDescriptionClass,
  reportKpiTrustPillClass,
  reportMetricCardClass,
  reportMetricCardCompactClass,
  reportMetricCardHeroClass,
} from "@/components/report/report-ui-tokens";
import { REPORT_KPI_TRUST_LABELS } from "@/lib/report/kpi-display-clusters";

export function ReportMetricCard({
  metric,
  definition,
  hero = false,
  compact = false,
}: {
  metric: ReportMetric;
  definition: ReportMetricRegistryEntry;
  hero?: boolean;
  compact?: boolean;
}) {
  const shell = hero ? reportMetricCardHeroClass : compact ? reportMetricCardCompactClass : reportMetricCardClass;
  const valueSize = hero ? "text-3xl sm:text-4xl" : compact ? "text-xl" : "text-2xl sm:text-3xl";
  const formatted = formatReportMetricValue(metric.value, definition.unit);
  const spark = metric.payload?.kind === "kpi" ? metric.payload.data.spark : undefined;

  return (
    <article className={shell}>
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="min-w-0 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          {definition.label}
        </p>
        {definition.trust ? (
          <span className={reportKpiTrustPillClass} title={`Fonte: ${REPORT_KPI_TRUST_LABELS[definition.trust]}`}>
            {REPORT_KPI_TRUST_LABELS[definition.trust]}
          </span>
        ) : null}
      </div>
      {definition.description ? <p className={reportKpiDescriptionClass}>{definition.description}</p> : null}
      <p className={`mt-2 font-semibold tracking-tight tabular-nums text-[color:var(--cab-text)] ${valueSize}`}>
        {formatted}
      </p>
      <ReportMetricCompareSection
        compare={metric.compare}
        unit={definition.unit}
        trendSemantics={definition.trendSemantics}
      />
      {spark != null ? (
        <div className="mt-auto flex min-w-0 items-end justify-between gap-2 pt-4">
          <span className="text-[10px] text-[color:var(--cab-text-muted)]">Trend 7gg</span>
          <ReportSparkline values={spark} className="text-[color:var(--cab-text-muted)]" />
        </div>
      ) : (
        <div className="mt-auto pt-2" />
      )}
    </article>
  );
}
