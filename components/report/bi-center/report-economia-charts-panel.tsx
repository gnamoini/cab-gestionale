"use client";

import { useMemo } from "react";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { ReportArAgingChart } from "@/components/report/primitives/chart/ar-aging-chart";
import { ReportClienteAgingHeatmap } from "@/components/report/primitives/chart/cliente-aging-heatmap";
import { ReportRevenueCollectionChart } from "@/components/report/primitives/chart/revenue-collection-chart";
import { ReportChartEmptyState } from "@/components/report/design-system";
import {
  buildClienteAgingHeatmap,
  buildRevenueCollectionMonthlySeries,
} from "@/lib/report/economic-analytics-extended";
import { buildInvoiceArAgingPoints } from "@/lib/report/economic-credit-analytics";
import { useInvoicesQuery } from "@/src/hooks/gestionale/use-invoices-query";
import { useRbac } from "@/src/hooks/use-rbac";

function formatSnapshotDate(anchor: Date): string {
  return anchor.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

export function ReportEconomiaRevenueTrendChart() {
  const { range, compareRange, showCompare } = useReportPeriodContext();
  const { canReadPage, isLoading: rbacLoading } = useRbac();
  const canFatturazione = canReadPage("fatturazione");
  const invoicesQ = useInvoicesQuery(canFatturazione);
  const invoices = invoicesQ.isError ? [] : invoicesQ.invoices;
  const payments = invoicesQ.isError ? [] : invoicesQ.payments;

  const revenueSeries = useMemo(
    () => buildRevenueCollectionMonthlySeries(invoices, payments, range),
    [invoices, payments, range],
  );
  const revenueCompareSeries = useMemo(
    () =>
      showCompare && compareRange
        ? buildRevenueCollectionMonthlySeries(invoices, payments, compareRange)
        : null,
    [invoices, payments, showCompare, compareRange],
  );

  if (!canFatturazione) return null;
  if (rbacLoading || invoicesQ.isLoading) {
    return <div className="h-48 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />;
  }
  if (invoicesQ.isError || revenueSeries.length === 0) {
    return <ReportChartEmptyState reason="no_data" detail="Nessun dato fatturato/incassato nel periodo." />;
  }

  return <ReportRevenueCollectionChart current={revenueSeries} compare={revenueCompareSeries} />;
}

export function ReportEconomiaArAgingChart() {
  const { anchor } = useReportPeriodContext();
  const { canReadPage, isLoading: rbacLoading } = useRbac();
  const canFatturazione = canReadPage("fatturazione");
  const invoicesQ = useInvoicesQuery(canFatturazione);
  const invoices = invoicesQ.isError ? [] : invoicesQ.invoices;

  const arAgingPoints = useMemo(() => buildInvoiceArAgingPoints(invoices, anchor), [invoices, anchor]);

  if (!canFatturazione) return null;
  if (rbacLoading || invoicesQ.isLoading) {
    return <div className="h-40 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />;
  }
  if (invoicesQ.isError || arAgingPoints.length === 0) {
    return <ReportChartEmptyState reason="no_data" detail="Nessun credito aperto da mostrare." />;
  }

  return <ReportArAgingChart points={arAgingPoints} />;
}

export function ReportEconomiaClienteHeatmap() {
  const { anchor } = useReportPeriodContext();
  const { canReadPage, isLoading: rbacLoading } = useRbac();
  const canFatturazione = canReadPage("fatturazione");
  const invoicesQ = useInvoicesQuery(canFatturazione);
  const invoices = invoicesQ.isError ? [] : invoicesQ.invoices;
  const snapshotLabel = formatSnapshotDate(anchor);

  const agingHeatmap = useMemo(() => buildClienteAgingHeatmap(invoices, anchor), [invoices, anchor]);

  if (!canFatturazione) return null;
  if (rbacLoading || invoicesQ.isLoading) {
    return <div className="h-48 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />;
  }
  if (invoicesQ.isError || agingHeatmap.length === 0) {
    return <ReportChartEmptyState reason="no_data" />;
  }

  return (
    <>
      <ReportClienteAgingHeatmap
        rows={agingHeatmap}
        title={`Crediti aperti per cliente — fotografia al ${snapshotLabel}`}
      />
      <p className="mt-2 text-xs text-[color:var(--cab-text-muted)]">
        La heatmap crediti è una fotografia allo stato attuale: non dipende dal periodo selezionato nella toolbar.
      </p>
    </>
  );
}

/** @deprecated Use area view orchestration */
export function ReportEconomiaChartsPanel() {
  return (
    <div className="space-y-4" data-testid="report-economia-charts-panel">
      <ReportEconomiaRevenueTrendChart />
      <ReportEconomiaArAgingChart />
      <ReportEconomiaClienteHeatmap />
    </div>
  );
}
