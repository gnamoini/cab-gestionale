"use client";

import { useMemo } from "react";
import {
  useRegisterAnalyticsSection,
  useReportAnalyticsContext,
} from "@/components/report/analytics/report-analytics-provider";
import { ReportAnalysisSectionShell } from "@/components/report/bi-center/report-analysis-section-shell";
import { ReportMetricDeltaRow } from "@/components/report/bi-center/advanced/report-trust-compare-footer";
import { ReportMultiMetricChart } from "@/components/report/bi-center/advanced/report-multi-metric-chart";
import {
  CROSS_DOMAIN_PAIRS,
  resolveMultiMetricDisplayMode,
} from "@/lib/report/bi-center/resolve-multi-metric-display-mode";

/** Cross-domain — certified deltas only, no UI interpretive sentences. */
export function ReportCrossDomainSection() {
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

  return (
    <ReportAnalysisSectionShell
      title="Analisi incrociate"
      subtitle="Confronto tra metriche certificate — senza inferenze causali"
      persistKey="bi-cross-domain"
      defaultCollapsed
    >
      {isLoading ? (
        <div className="h-24 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />
      ) : (
        <div className="space-y-6">
          {CROSS_DOMAIN_PAIRS.map((pair) => {
            const mode = resolveMultiMetricDisplayMode(pair.metricA, pair.metricB, pair.granularity);
            if (mode === "blocked") return null;
            const seriesA = result?.series.find((s) => s.metricId === pair.metricA);
            const seriesB = result?.series.find((s) => s.metricId === pair.metricB);
            return (
              <section key={pair.id} className="space-y-3 rounded-lg border border-[color:var(--cab-border)] p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <ReportMetricDeltaRow envelope={envelopesById.get(pair.metricA)} />
                  <ReportMetricDeltaRow envelope={envelopesById.get(pair.metricB)} />
                </div>
                <ReportMultiMetricChart
                  mode={mode}
                  seriesA={seriesA}
                  seriesB={seriesB}
                  metricA={pair.metricA}
                  metricB={pair.metricB}
                />
              </section>
            );
          })}
        </div>
      )}
    </ReportAnalysisSectionShell>
  );
}
