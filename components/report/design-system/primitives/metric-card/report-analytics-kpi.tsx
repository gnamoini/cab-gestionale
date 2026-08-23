"use client";

import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import { formatReportMetricValue, unitToReportFormatter } from "@/lib/report/metrics/report-value-formatter";
import { ReportMetricCompareSection } from "@/components/report/report-metric-compare-section";
import { ReportTrustBadge } from "@/components/report/bi-center/report-trust-badge";
import { ReportSparkline } from "@/components/report/report-sparkline";
import type { ReportMetricSeries } from "@/lib/report/analytics-engine/types";
import { useMetricDrillDown } from "@/components/report/bi-center/use-metric-drill-down";
import { getReportBusinessLabelCardCopy } from "@/lib/report/ui/report-business-labels";
import {
  reportTypographyDescriptionClass,
  reportTypographyLabelClass,
} from "@/components/report/design-system/typography/report-typography";
import { useReportDensity } from "@/components/report/design-system/internal/use-report-density";

/** SSOT KPI card for Report analytics — envelope + drill-down + compare. */
export function ReportAnalyticsKpi({
  envelope,
  series,
  hero = false,
  compact = false,
}: {
  envelope: ReportMetricEnvelope;
  series?: ReportMetricSeries;
  hero?: boolean;
  compact?: boolean;
}) {
  const registry = getRegistryEntry(envelope.metricId);
  const cardCopy = getReportBusinessLabelCardCopy(envelope.metricId, compact);
  const { supported, open } = useMetricDrillDown(envelope.metricId);
  const { metricCardPadding, metricCardMinHeight, metricValueScale } = useReportDensity();
  if (!registry) return null;

  const unavailable = envelope.trust === "not_available";
  const formatter = registry.formatter ?? unitToReportFormatter(registry.unit);
  const formatted = unavailable ? "—" : formatReportMetricValue(envelope.metric.value, formatter);
  const spark =
    series?.points.map((p) => p.value).filter((v): v is number => v != null) ?? undefined;
  const showCompare =
    !compact && envelope.metric.compare != null && envelope.metric.compare.status === "available";

  const shell = [
    "flex min-w-0 flex-col rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-[var(--cab-shadow-sm)]",
    metricCardPadding,
    compact ? "rounded-[var(--ds-radius-lg)]" : metricCardMinHeight,
    hero
      ? "border-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_4%,var(--cab-card))]"
      : "",
    supported ? "cursor-pointer transition hover:border-[color:color-mix(in_srgb,var(--cab-primary)_20%,var(--cab-border))]" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const valueSize = hero ? "text-3xl sm:text-4xl" : compact ? "text-xl" : metricValueScale;

  const handleActivate = () => {
    if (!supported) return;
    open();
  };

  return (
    <article
      className={shell}
      data-metric-id={envelope.metricId}
      data-drilldown={supported ? "true" : undefined}
      role={supported ? "button" : undefined}
      tabIndex={supported ? 0 : undefined}
      onClick={supported ? handleActivate : undefined}
      onKeyDown={
        supported
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleActivate();
              }
            }
          : undefined
      }
    >
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className={`min-w-0 ${reportTypographyLabelClass}`} title={cardCopy.tooltip}>
            {cardCopy.title}
          </p>
          {cardCopy.hint ? <p className={reportTypographyDescriptionClass}>{cardCopy.hint}</p> : null}
        </div>
        <ReportTrustBadge trust={envelope.trust} compact={compact} />
      </div>
      <p className={`mt-2 font-semibold tracking-tight tabular-nums text-[color:var(--cab-text)] ${valueSize}`}>
        {formatted}
      </p>
      {unavailable ? (
        <p className="mt-2 text-xs text-[color:var(--cab-text-muted)]">Dati non disponibili nel periodo</p>
      ) : (
        <>
          {showCompare ? (
            <ReportMetricCompareSection
              compare={envelope.metric.compare}
              unit={envelope.unit}
              trendSemantics={registry.trendSemantics}
            />
          ) : null}
          {!compact && spark && spark.length > 1 ? (
            <div className="mt-2">
              <ReportSparkline values={spark} />
            </div>
          ) : null}
        </>
      )}
    </article>
  );
}

/** @deprecated Use ReportAnalyticsKpi */
export const ReportMetricEnvelopeCard = ReportAnalyticsKpi;
