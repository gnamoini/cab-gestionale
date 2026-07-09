"use client";

import { ReportSparkline } from "@/components/report/report-sparkline";
import { ReportMetricCompareSection } from "@/components/report/report-metric-compare-section";
import { useReportDensity } from "@/components/report/design-system/internal/use-report-density";
import {
  reportTypographyDescriptionClass,
  reportTypographyLabelClass,
} from "@/components/report/design-system/typography/report-typography";
import { formatReportMetricValue } from "@/lib/report/metrics/report-value-formatter";
import type { ReportMetric, ReportMetricRegistryEntry } from "@/lib/report/metrics/report-metric-types";
import { unitToReportFormatter } from "@/lib/report/metrics/report-value-formatter";
import { REPORT_KPI_TRUST_LABELS } from "@/lib/report/kpi-display-clusters";
import { reportKpiTrustPillClass } from "@/components/report/report-ui-tokens";

export function MetricCard({
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
  const { metricCardPadding, metricCardMinHeight, metricValueScale } = useReportDensity();
  const shell = [
    "flex min-w-0 flex-col rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-[var(--cab-shadow-sm)]",
    metricCardPadding,
    compact ? "rounded-[var(--ds-radius-lg)]" : metricCardMinHeight,
    hero
      ? "border-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_4%,var(--cab-card))]"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const formatter = definition.formatter ?? unitToReportFormatter(definition.unit);
  const formatted = formatReportMetricValue(metric.value, formatter);
  const valueSize = hero ? "text-3xl sm:text-4xl" : compact ? "text-xl" : metricValueScale;
  const spark = metric.payload?.kind === "kpi" ? metric.payload.data.spark : undefined;

  return (
    <article className={shell}>
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className={`min-w-0 ${reportTypographyLabelClass}`}>{definition.label}</p>
        {definition.trust ? (
          <span className={reportKpiTrustPillClass} title={`Fonte: ${REPORT_KPI_TRUST_LABELS[definition.trust]}`}>
            {REPORT_KPI_TRUST_LABELS[definition.trust]}
          </span>
        ) : null}
      </div>
      {definition.description ? <p className={reportTypographyDescriptionClass}>{definition.description}</p> : null}
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
