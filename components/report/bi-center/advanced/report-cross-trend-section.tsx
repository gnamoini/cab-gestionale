"use client";

import { useMemo } from "react";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { useReportDomainSnapshot } from "@/components/report/context/report-domain-snapshot-context";
import { useRegisterAnalyticsSection } from "@/components/report/analytics/report-analytics-provider";
import { ReportMultiSeriesLineChart, ReportVisualization } from "@/components/report/design-system";
import { KPI_CHART_SERIES_COLORS } from "@/components/report/design-system/primitives/chart/multi-series-line-chart";
import {
  buildCrossMonthlyTrend,
  crossTrendIndexedSeries,
} from "@/lib/report/cross-analysis/build-cross-monthly-trend";
import { auditCrossMonthlySeriesCertification } from "@/lib/report/legacy/cross-series-audit";
import { useInvoicesQuery } from "@/src/hooks/gestionale/use-invoices-query";
import { useReportTimesheetKpi } from "@/src/hooks/use-report-timesheet-kpi";
import { useRbac } from "@/src/hooks/use-rbac";

/** Indexed cross-domain trend — builder SSOT; engine supportsSeries remains false until audit certifies buckets. */
export function ReportCrossTrendSection() {
  const { range } = useReportPeriodContext();
  const { completate, manualByMonth, magLog, magazzinoRows, schedeStore, costoOrario } =
    useReportDomainSnapshot();
  const { canReadPage, isLoading: rbacLoading } = useRbac();
  const canFatturazione = canReadPage("fatturazione");
  const invoicesQ = useInvoicesQuery(canFatturazione);
  const timesheet = useReportTimesheetKpi(range);

  const invoices = invoicesQ.isError ? [] : invoicesQ.invoices;

  useRegisterAnalyticsSection("bi-cross-trend", "cross", {
    metricIds: ["cross_efficiency", "cross_parts_job", "cross_cost_job", "cross_value_hour"],
    includeSeries: false,
  });

  const monthlyTrend = useMemo(
    () =>
      buildCrossMonthlyTrend({
        range,
        completate,
        manualByMonth,
        magLog,
        magazzinoRows,
        timesheetEntries: timesheet.entries,
        schedeStore,
        costoOrario,
        invoices,
      }),
    [
      range,
      completate,
      manualByMonth,
      magLog,
      magazzinoRows,
      timesheet.entries,
      schedeStore,
      costoOrario,
      invoices,
    ],
  );

  const seriesAudit = useMemo(() => auditCrossMonthlySeriesCertification(monthlyTrend), [monthlyTrend]);

  const trendSeries = useMemo(() => {
    const indexed = crossTrendIndexedSeries(monthlyTrend);
    const toPoints = (key: keyof (typeof indexed)[0], id: string, label: string, color: string) => ({
      id,
      label,
      color,
      unit: "ratio" as const,
      points: indexed.map((p) => ({
        date: p.label,
        displayValue: p[key] as number,
        realValue: p[key] as number,
      })),
    });
    const defs = [
      { key: "efficiency" as const, id: "eff", label: "Efficienza", color: KPI_CHART_SERIES_COLORS[0]!, auditKey: "efficiency" as const },
      { key: "partsPerJob" as const, id: "parts", label: "Ricambi/int", color: KPI_CHART_SERIES_COLORS[1]!, auditKey: "partsPerJob" as const },
      { key: "costPerJob" as const, id: "cost", label: "Costo medio", color: KPI_CHART_SERIES_COLORS[2]!, auditKey: "costPerJob" as const },
      { key: "valuePerHour" as const, id: "value", label: "Valore/ora", color: KPI_CHART_SERIES_COLORS[3]!, auditKey: "valuePerHour" as const },
    ];
    return defs
      .filter((d) => seriesAudit[d.auditKey])
      .map((d) => toPoints(d.key, d.id, d.label, d.color));
  }, [monthlyTrend, seriesAudit]);

  const loading = rbacLoading || timesheet.isLoading || (canFatturazione && invoicesQ.isLoading);

  if (!canFatturazione) {
    return null;
  }

  if (loading) {
    return <div className="h-48 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />;
  }

  if (trendSeries.length === 0) {
    return (
      <p className="text-sm text-[color:var(--cab-text-muted)]" data-testid="report-cross-trend-section-kpi-only">
        Trend indicizzato non disponibile: serie mensili non certificate. I KPI incrociati restano nella griglia sopra.
      </p>
    );
  }

  return (
    <div data-testid="report-cross-trend-section">
      <ReportVisualization title="Andamento mensile KPI trasversali (indice base 100)">
        <ReportMultiSeriesLineChart series={trendSeries} displayMode="indexed" />
      </ReportVisualization>
    </div>
  );
}
