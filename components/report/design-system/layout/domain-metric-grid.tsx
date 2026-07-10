"use client";

import { useMemo } from "react";
import { fromDomainMetrics } from "@/lib/report/adapters/from-domain-metric";
import { ReportMetricGrid } from "@/components/report/design-system/layout/metric-grid";
import type { ReportDomainMetric } from "@/lib/report/report-domain-types";
import type { ReportCompareMode } from "@/lib/report/date-ranges";
import { LoadingSkeletonBlock } from "@/components/design-system/loading/loading-skeleton";
import { Button } from "@/components/design-system/button";
import { useReportDensity } from "@/components/report/design-system/internal/use-report-density";
import { reportContentPanelClass } from "@/components/report/report-ui-tokens";

function MetricPlaceholder({ metric }: { metric: ReportDomainMetric }) {
  const { metricCardPadding } = useReportDensity();
  const shell = `flex min-w-0 flex-col rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-[var(--cab-shadow-sm)] ${metricCardPadding}`;
  const { state } = metric;
  if (state.status === "loading") {
    return (
      <article className={shell}>
        <LoadingSkeletonBlock className="min-h-[4rem]" />
      </article>
    );
  }
  if (state.status === "error") {
    return (
      <article className={shell}>
        <p className="text-sm text-[color:var(--cab-danger)]">{state.message}</p>
        {state.retry ? (
          <Button type="button" variant="secondary" size="sm" onClick={state.retry} className="mt-2">
            Riprova
          </Button>
        ) : null}
      </article>
    );
  }
  return (
    <article className={shell}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
        {metric.label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[color:var(--cab-text-muted)]">N/D</p>
    </article>
  );
}

/** Bridge domain metrics (loading/error) → ReportMetricGrid. */
export function ReportDomainMetricsGrid({
  metrics,
  compact,
  compareMode = "none",
}: {
  metrics: readonly ReportDomainMetric[];
  compact?: boolean;
  compareMode?: ReportCompareMode;
}) {
  const converted = useMemo(() => fromDomainMetrics(metrics, compareMode), [metrics, compareMode]);
  const pending = metrics.filter((m) => {
    const entry = m.state;
    return entry.status !== "available" || converted.every((c) => c.id !== m.id);
  });

  if (converted.length === 0 && pending.length === 0) return null;

  const { metricGridCols } = useReportDensity();

  return (
    <div className={`${reportContentPanelClass} space-y-3`}>
      <ReportMetricGrid metrics={converted} compact={compact} />
      {pending.length > 0 ? (
        <div className={`grid min-w-0 gap-3 ${metricGridCols}`}>
          {pending.map((m) => (
            <MetricPlaceholder key={m.id} metric={m} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
