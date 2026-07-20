"use client";

import { useMemo } from "react";
import { ReportDomainMetricsGrid } from "@/components/report/design-system";
import { fromDomainMetrics } from "@/lib/report/adapters/from-domain-metric";
import { ReportMetricGrid } from "@/components/report/design-system/layout/metric-grid";
import { reportContentPanelClass } from "@/components/report/report-ui-tokens";
import {
  ECONOMIC_ANALYSIS_METRIC_IDS,
  ECONOMIC_DETAIL_METRIC_IDS,
  ECONOMIC_HERO_METRIC_IDS,
  ECONOMIC_SECONDARY_METRIC_IDS,
} from "@/lib/report/economic-metric-clusters";
import type { ReportCompareMode } from "@/lib/report/date-ranges";
import type { ReportDomainMetric } from "@/lib/report/report-domain-types";

function pickMetrics(metrics: readonly ReportDomainMetric[], ids: readonly string[]): ReportDomainMetric[] {
  const byId = new Map(metrics.map((m) => [m.id, m]));
  const out: ReportDomainMetric[] = [];
  for (const id of ids) {
    const m = byId.get(id);
    if (m) out.push(m);
  }
  return out;
}

function MetricsBlock({
  metrics,
  compareMode,
  hero,
  compact,
}: {
  metrics: readonly ReportDomainMetric[];
  compareMode: ReportCompareMode;
  hero?: boolean;
  compact?: boolean;
}) {
  const converted = useMemo(() => fromDomainMetrics(metrics, compareMode), [metrics, compareMode]);
  if (converted.length === 0 && metrics.length === 0) return null;
  if (converted.length > 0) {
    return (
      <div className={reportContentPanelClass}>
        <ReportMetricGrid metrics={converted} hero={hero} compact={compact} />
      </div>
    );
  }
  return <ReportDomainMetricsGrid metrics={metrics} compareMode={compareMode} compact={compact} />;
}

export function ReportEconomicMetricsLayout({
  metrics,
  compareMode = "none",
}: {
  metrics: readonly ReportDomainMetric[];
  compareMode?: ReportCompareMode;
}) {
  const hero = useMemo(() => pickMetrics(metrics, ECONOMIC_HERO_METRIC_IDS), [metrics]);
  const secondary = useMemo(() => pickMetrics(metrics, ECONOMIC_SECONDARY_METRIC_IDS), [metrics]);
  const analysis = useMemo(() => pickMetrics(metrics, ECONOMIC_ANALYSIS_METRIC_IDS), [metrics]);
  const detail = useMemo(() => pickMetrics(metrics, ECONOMIC_DETAIL_METRIC_IDS), [metrics]);

  return (
    <div className="min-w-0 space-y-4">
      <MetricsBlock metrics={hero} compareMode={compareMode} hero />
      {secondary.length > 0 ? (
        <MetricsBlock metrics={secondary} compareMode={compareMode} compact />
      ) : null}
      {analysis.length > 0 ? (
        <MetricsBlock metrics={analysis} compareMode={compareMode} compact />
      ) : null}
      {detail.length > 0 ? (
        <MetricsBlock metrics={detail} compareMode={compareMode} compact />
      ) : null}
    </div>
  );
}
