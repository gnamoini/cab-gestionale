"use client";

import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import { formatReportMetricValue } from "@/lib/report/metrics/format-report-metric-value";
import { ReportMetricCompareSection } from "@/components/report/report-metric-compare-section";
import { ReportTrustBadge } from "@/components/report/bi-center/report-trust-badge";
import { ReportSparkline } from "@/components/report/report-sparkline";
import type { ReportMetricSeries } from "@/lib/report/analytics-engine/types";
import { useMetricDrillDown } from "@/components/report/bi-center/use-metric-drill-down";
import { getReportBusinessLabelCardCopy } from "@/lib/report/ui/report-business-labels";

export function ReportMetricEnvelopeCard({
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
  if (!registry) return null;

  const unavailable = envelope.trust === "not_available";
  const formatter = registry.formatter ?? registry.unit;
  const formatted = unavailable
    ? "—"
    : formatReportMetricValue(envelope.metric.value, formatter);
  const spark =
    series?.points
      .map((p) => p.value)
      .filter((v): v is number => v != null) ?? undefined;
  const showCompare =
    !compact && envelope.metric.compare != null && envelope.metric.compare.status === "available";

  const shell = [
    "flex min-w-0 flex-col rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-[var(--cab-shadow-sm)]",
    hero ? "border-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-border))]" : "",
    compact ? "p-3" : "min-h-[7rem] p-4",
    supported ? "cursor-pointer transition hover:border-[color:color-mix(in_srgb,var(--cab-primary)_20%,var(--cab-border))]" : "",
  ]
    .filter(Boolean)
    .join(" ");

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
          <h3
            className={`font-medium leading-snug text-[color:var(--cab-text)] ${
              compact ? "line-clamp-2 text-xs" : "line-clamp-2 text-sm"
            }`}
            title={cardCopy.tooltip}
          >
            {cardCopy.title}
          </h3>
          {cardCopy.hint ? (
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-[color:var(--cab-text-muted)]">
              {cardCopy.hint}
            </p>
          ) : null}
        </div>
        <ReportTrustBadge trust={envelope.trust} compact={compact} />
      </div>
      <p
        className={`mt-2 font-semibold tabular-nums tracking-tight text-[color:var(--cab-text)] ${
          hero ? "text-3xl" : compact ? "text-xl" : "text-2xl"
        }`}
      >
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
