"use client";

import { useMemo } from "react";
import {
  useRegisterAnalyticsSection,
  useReportAnalyticsContext,
} from "@/components/report/analytics/report-analytics-provider";
import { resolveSectionMetricIds } from "@/components/report/analytics/resolve-section-metric-ids";
import { ReportAnalyticsKpi } from "@/components/report/design-system/primitives/metric-card/report-analytics-kpi";
import { LoadingErrorState } from "@/components/design-system";
import { ReportMetricDeltaRow } from "@/components/report/bi-center/advanced/report-trust-compare-footer";
import { ReportMultiMetricChart } from "@/components/report/bi-center/advanced/report-multi-metric-chart";
import {
  CROSS_DOMAIN_PAIRS,
  resolveMultiMetricDisplayMode,
} from "@/lib/report/bi-center/resolve-multi-metric-display-mode";

export function ReportCrossMetricsKpiStrip() {
  const metricIds = useMemo(() => resolveSectionMetricIds("cross"), []);
  const { envelopesById, isLoading, isError, error, refetch } = useReportAnalyticsContext();

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricIds.map((id) => (
          <div key={id} className="h-28 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <LoadingErrorState
        title="Indicatori non disponibili"
        description={error?.message ?? "Errore di caricamento"}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metricIds.map((id) => {
        const env = envelopesById.get(id);
        if (!env) return null;
        return <ReportAnalyticsKpi key={id} envelope={env} compact />;
      })}
    </div>
  );
}

export function ReportCrossDomainComparisons() {
  const metricIds = useMemo(
    () => [...new Set(CROSS_DOMAIN_PAIRS.flatMap((p) => [p.metricA, p.metricB]))],
    [],
  );

  useRegisterAnalyticsSection("bi-cross-domain", "primaryTrend", {
    metricIds,
    includeSeries: true,
    granularity: "month",
  });

  const { envelopesById, result, isLoading } = useReportAnalyticsContext();

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />;
  }

  return (
    <div className="space-y-6" data-testid="report-cross-domain-comparisons">
      {CROSS_DOMAIN_PAIRS.map((pair) => {
        const mode = resolveMultiMetricDisplayMode(pair.metricA, pair.metricB, pair.granularity);
        if (mode === "blocked") return null;
        const seriesA = result?.series.find((s) => s.metricId === pair.metricA);
        const seriesB = result?.series.find((s) => s.metricId === pair.metricB);
        const labelA = envelopesById.get(pair.metricA);
        const labelB = envelopesById.get(pair.metricB);
        return (
          <div key={pair.id} className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <ReportMetricDeltaRow envelope={labelA} />
              <ReportMetricDeltaRow envelope={labelB} />
            </div>
            <ReportMultiMetricChart
              mode={mode}
              seriesA={seriesA}
              seriesB={seriesB}
              metricA={pair.metricA}
              metricB={pair.metricB}
            />
          </div>
        );
      })}
    </div>
  );
}

/** @deprecated Use area view orchestration */
export function ReportCrossMetricsSection() {
  useRegisterAnalyticsSection("bi-cross-metrics", "cross", {
    metricIds: resolveSectionMetricIds("cross"),
    includeSeries: false,
  });
  return <ReportCrossMetricsKpiStrip />;
}
