"use client";

import { useMemo } from "react";
import {
  useRegisterAnalyticsSection,
  useReportAnalyticsContext,
} from "@/components/report/analytics/report-analytics-provider";
import { resolveSectionMetricIds } from "@/components/report/analytics/resolve-section-metric-ids";
import { ReportAnalysisSectionShell } from "@/components/report/bi-center/report-analysis-section-shell";
import { ReportMetricEnvelopeCard } from "@/components/report/bi-center/report-metric-envelope-card";
import { LoadingErrorState } from "@/components/design-system";

/** Cross KPI grid — engine-backed; pairwise trends stay in ReportCrossDomainSection. */
export function ReportCrossMetricsSection() {
  const metricIds = useMemo(() => resolveSectionMetricIds("cross"), []);

  useRegisterAnalyticsSection("bi-cross-metrics", "cross", {
    metricIds,
    includeSeries: false,
  });

  const { envelopesById, isLoading, isError, error, refetch } = useReportAnalyticsContext();

  return (
    <ReportAnalysisSectionShell
      title="Indicatori incrociati"
      subtitle="Rapporti derivati tra aree — senza inferenze causali"
      persistKey="bi-cross-metrics"
      defaultCollapsed
    >
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metricIds.map((id) => (
            <div key={id} className="h-28 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />
          ))}
        </div>
      ) : isError ? (
        <LoadingErrorState
          title="Indicatori incrociati non disponibili"
          description={error?.message ?? "Errore di caricamento"}
          onRetry={() => refetch()}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metricIds.map((id) => {
            const env = envelopesById.get(id);
            if (!env) return null;
            return <ReportMetricEnvelopeCard key={id} envelope={env} compact />;
          })}
        </div>
      )}
    </ReportAnalysisSectionShell>
  );
}
