"use client";

import type { ReportDomainMetric } from "@/lib/report/report-domain-types";
import {
  reportKpiDescriptionClass,
  reportMetricCardClass,
  reportMetricCardCompactClass,
} from "@/components/report/report-ui-tokens";
import { LoadingSkeletonBlock } from "@/components/design-system/loading/loading-skeleton";
import { Button } from "@/components/design-system/button";

function MetricValue({ metric }: { metric: ReportDomainMetric }) {
  const { state } = metric;
  switch (state.status) {
    case "available":
      return (
        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[color:var(--cab-text)]">
          {state.value}
        </p>
      );
    case "loading":
      return <LoadingSkeletonBlock className="mt-2 min-h-[2rem] w-24" />;
    case "error":
      return (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-[color:var(--cab-danger)]">{state.message}</p>
          {state.retry ? (
            <Button type="button" variant="secondary" size="sm" onClick={state.retry}>
              Riprova
            </Button>
          ) : null}
        </div>
      );
    case "not_available":
      return (
        <p className="mt-2 text-2xl font-semibold text-[color:var(--cab-text-muted)]" title={state.reason}>
          N/D
        </p>
      );
    case "not_loaded":
      return (
        <p className="mt-2 text-sm text-[color:var(--cab-text-muted)]" title={state.hint}>
          N/D
        </p>
      );
    default:
      return null;
  }
}

export function ReportDomainMetricCard({ metric, compact }: { metric: ReportDomainMetric; compact?: boolean }) {
  const shell = compact ? reportMetricCardCompactClass : reportMetricCardClass;
  const hint =
    metric.state.status === "not_loaded"
      ? metric.state.hint
      : metric.state.status === "not_available"
        ? metric.state.reason
        : undefined;

  return (
    <article className={shell} title={hint}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
        {metric.label}
      </p>
      <MetricValue metric={metric} />
      {hint ? <p className={`mt-1 ${reportKpiDescriptionClass}`}>{hint}</p> : null}
    </article>
  );
}

export function ReportDomainMetricsGrid({
  metrics,
  compact,
}: {
  metrics: readonly ReportDomainMetric[];
  compact?: boolean;
}) {
  if (metrics.length === 0) return null;
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m) => (
        <ReportDomainMetricCard key={m.id} metric={m} compact={compact} />
      ))}
    </div>
  );
}
