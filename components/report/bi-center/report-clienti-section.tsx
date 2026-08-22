"use client";

import { useMemo } from "react";
import {
  useRegisterAnalyticsSection,
  useReportAnalyticsContext,
} from "@/components/report/analytics/report-analytics-provider";
import { resolveSectionMetricIds } from "@/components/report/analytics/resolve-section-metric-ids";
import { buildAnalyticsPeriodFromContext } from "@/components/report/analytics/report-period-to-analytics";
import { mapUiCompareToEnvelope } from "@/components/report/bi-center/drill-down/compare-mode-bridge";
import { ReportAnalysisSectionShell } from "@/components/report/bi-center/report-analysis-section-shell";
import { ReportMetricEnvelopeCard } from "@/components/report/bi-center/report-metric-envelope-card";
import { ReportBarChart } from "@/components/report/design-system";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { useReportDrillDown } from "@/components/report/bi-center/use-report-drill-down";
import { formatReportMetricValue } from "@/lib/report/metrics/format-report-metric-value";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import { ReportModuleOwnerCta } from "@/components/report/bi-center/report-module-owner-cta";

export function ReportClientiSection() {
  useRegisterAnalyticsSection("bi-clienti", "clienti", { dimensions: ["cliente"] });
  const { result, isLoading, envelopesById } = useReportAnalyticsContext();
  const periodCtx = useReportPeriodContext();
  const drill = useReportDrillDown();

  const kpiIds = useMemo(() => resolveSectionMetricIds("clienti").filter((id) => id !== "eco_fatturato"), []);

  const breakdown = result?.dimensions.find(
    (d) => d.dimension === "cliente" && d.metricId === "eco_fatturato",
  );
  const totalEnvelope = result?.metrics.find((m) => m.metricId === "eco_fatturato");

  const chartRows = useMemo(
    () =>
      (breakdown?.rows ?? []).slice(0, 10).map((r) => ({
        label: r.label,
        value: r.value,
        key: r.key,
      })),
    [breakdown?.rows],
  );

  const formatter = getRegistryEntry("eco_fatturato")?.formatter ?? "currency";
  const totalLabel =
    totalEnvelope && totalEnvelope.trust !== "not_available"
      ? formatReportMetricValue(totalEnvelope.metric.value, formatter)
      : "—";

  const openCliente = (customerId: string) => {
    drill.openBreakdownDrillDown({
      metricId: "eco_fatturato",
      period: buildAnalyticsPeriodFromContext(periodCtx),
      compareMode: mapUiCompareToEnvelope(periodCtx.compareMode),
      dimension: "cliente",
      dimensionValue: customerId,
    });
  };

  return (
    <ReportAnalysisSectionShell
      title="Clienti"
      subtitle={`Pareto fatturato periodo — totale ${totalLabel}`}
      persistKey="bi-clienti"
      defaultCollapsed
    >
      {kpiIds.length > 0 ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {kpiIds.map((id) => {
            const env = envelopesById.get(id);
            if (!env) return null;
            return <ReportMetricEnvelopeCard key={id} envelope={env} compact />;
          })}
        </div>
      ) : null}
      {isLoading ? (
        <div className="h-40 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />
      ) : chartRows.length === 0 ? (
        <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun cliente con fatturato nel periodo</p>
      ) : (
        <>
          <ReportBarChart title="Top clienti per fatturato" points={chartRows} />
          <ul className="mt-3 space-y-1">
            {chartRows.map((row) => (
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
        </>
      )}
      <ReportModuleOwnerCta owner="mezzi" />
    </ReportAnalysisSectionShell>
  );
}
