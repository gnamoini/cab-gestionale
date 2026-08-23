"use client";

import { useMemo } from "react";
import { useReportAnalyticsContext } from "@/components/report/analytics/report-analytics-provider";
import { buildAnalyticsPeriodFromContext } from "@/components/report/analytics/report-period-to-analytics";
import { mapUiCompareToEnvelope } from "@/components/report/bi-center/drill-down/compare-mode-bridge";
import { ReportAnalyticsKpi } from "@/components/report/design-system/primitives/metric-card/report-analytics-kpi";
import { ReportBarChart, ReportChartEmptyState, ReportNarrativeBlock } from "@/components/report/design-system";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { useReportDrillDown } from "@/components/report/bi-center/use-report-drill-down";
import { formatReportMetricValue } from "@/lib/report/metrics/report-value-formatter";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import { resolveSectionMetricIds } from "@/components/report/analytics/resolve-section-metric-ids";
import { buildReportDataInsight } from "@/lib/report/ui/report-data-insight";
import { getReportBusinessLabel } from "@/lib/report/ui/report-business-labels";
import { REPORT_EMPTY_STATE_COPY } from "@/lib/report/ui/report-copy";

export function ReportClientiKpiStrip() {
  const { envelopesById } = useReportAnalyticsContext();
  const kpiIds = useMemo(() => resolveSectionMetricIds("clienti").filter((id) => id !== "eco_fatturato"), []);

  return (
    <>
      {kpiIds.map((id) => {
        const env = envelopesById.get(id);
        if (!env) return null;
        return <ReportAnalyticsKpi key={id} envelope={env} compact />;
      })}
    </>
  );
}

export function ReportClientiFatturatoCompareAside() {
  const { envelopesById } = useReportAnalyticsContext();
  const envelope = envelopesById.get("eco_fatturato");
  const compare = envelope?.metric.compare;
  const label = getReportBusinessLabel("eco_fatturato").title;

  const insight =
    compare?.status === "available"
      ? buildReportDataInsight({
          metricLabel: label,
          value: envelope?.metric.value ?? null,
          deltaPercent: compare.deltaPercent,
          trend:
            compare.deltaPercent == null
              ? null
              : compare.deltaPercent > 0
                ? "up"
                : compare.deltaPercent < 0
                  ? "down"
                  : "flat",
        })
      : null;

  if (!envelope || envelope.trust === "not_available") {
    return <ReportChartEmptyState reason="not_applicable" detail={REPORT_EMPTY_STATE_COPY.noCompare} />;
  }

  return (
    <div className="space-y-3">
      <ReportAnalyticsKpi envelope={envelope} compact />
      {insight ? <ReportNarrativeBlock variant="explanation">{insight}</ReportNarrativeBlock> : null}
    </div>
  );
}

export function ReportClientiParetoChart() {
  const { result, isLoading } = useReportAnalyticsContext();
  const breakdown = result?.dimensions.find(
    (d) => d.dimension === "cliente" && d.metricId === "eco_fatturato",
  );

  const chartRows = useMemo(
    () =>
      (breakdown?.rows ?? []).slice(0, 10).map((r) => ({
        label: r.label,
        value: r.value,
        key: r.key,
      })),
    [breakdown?.rows],
  );

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />;
  }
  if (chartRows.length === 0) {
    return <ReportChartEmptyState reason="no_data" detail="Nessun cliente con fatturato nel periodo." />;
  }

  return <ReportBarChart title="Fatturato per cliente" points={chartRows} />;
}

export function ReportClientiDetailList() {
  const { result, isLoading } = useReportAnalyticsContext();
  const periodCtx = useReportPeriodContext();
  const drill = useReportDrillDown();

  const breakdown = result?.dimensions.find(
    (d) => d.dimension === "cliente" && d.metricId === "eco_fatturato",
  );
  const formatter = getRegistryEntry("eco_fatturato")?.formatter ?? "currency";

  const rows = useMemo(
    () =>
      (breakdown?.rows ?? []).map((r) => ({
        label: r.label,
        value: r.value,
        key: r.key,
      })),
    [breakdown?.rows],
  );

  const openCliente = (customerId: string) => {
    drill.openBreakdownDrillDown({
      metricId: "eco_fatturato",
      period: buildAnalyticsPeriodFromContext(periodCtx),
      compareMode: mapUiCompareToEnvelope(periodCtx.compareMode),
      dimension: "cliente",
      dimensionValue: customerId,
    });
  };

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />;
  }
  if (rows.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-1" data-testid="report-clienti-detail-list">
      {rows.map((row) => (
        <li key={row.key}>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-[color:var(--cab-surface-muted)]"
            onClick={() => openCliente(row.key)}
          >
            <span className="min-w-0 truncate font-medium">{row.label}</span>
            <span className="shrink-0 tabular-nums text-[color:var(--cab-text-muted)]">
              {formatReportMetricValue(row.value, formatter)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** @deprecated Use area view orchestration — kept for bi-center shell compatibility */
export function ReportClientiSection() {
  return (
    <>
      <ReportClientiKpiStrip />
      <ReportClientiParetoChart />
      <ReportClientiDetailList />
    </>
  );
}
