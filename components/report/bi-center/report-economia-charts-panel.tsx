"use client";

import { useMemo } from "react";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { ReportArAgingChart } from "@/components/report/primitives/chart/ar-aging-chart";
import { ReportClienteAgingHeatmap } from "@/components/report/primitives/chart/cliente-aging-heatmap";
import { ReportPreventiviFunnelChart } from "@/components/report/primitives/chart/preventivi-funnel-chart";
import { ReportRevenueCollectionChart } from "@/components/report/primitives/chart/revenue-collection-chart";
import {
  buildClienteAgingHeatmap,
  buildPreventiviFunnel,
  buildRevenueCollectionMonthlySeries,
} from "@/lib/report/economic-analytics-extended";
import { buildInvoiceArAgingPoints } from "@/lib/report/economic-credit-analytics";
import { useInvoicesQuery } from "@/src/hooks/gestionale/use-invoices-query";
import { usePreventiviRecordsQuery } from "@/src/hooks/gestionale/use-preventivi-records-query";
import { useRbac } from "@/src/hooks/use-rbac";

function formatSnapshotDate(anchor: Date): string {
  return anchor.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

/** Economia advanced charts — margin waterfall intentionally excluded (BLOCKED until certified). */
export function ReportEconomiaChartsPanel() {
  const { range, compareRange, showCompare, anchor } = useReportPeriodContext();
  const { canReadPage, isLoading: rbacLoading } = useRbac();
  const canFatturazione = canReadPage("fatturazione");
  const canPreventivi = canReadPage("preventivi");

  const invoicesQ = useInvoicesQuery(canFatturazione);
  const preventiviQ = usePreventiviRecordsQuery(canPreventivi);

  const invoices = invoicesQ.isError ? [] : invoicesQ.invoices;
  const payments = invoicesQ.isError ? [] : invoicesQ.payments;
  const preventivi = preventiviQ.isError ? [] : preventiviQ.records;

  const invoicesFailed = canFatturazione && !invoicesQ.isLoading && invoicesQ.isError;
  const preventiviFailed = canPreventivi && !preventiviQ.isLoading && preventiviQ.isError;

  const loading =
    rbacLoading ||
    (canFatturazione && invoicesQ.isLoading) ||
    (canPreventivi && preventiviQ.isLoading);

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

  const arAgingPoints = useMemo(() => buildInvoiceArAgingPoints(invoices, anchor), [invoices, anchor]);

  const funnelRows = useMemo(() => buildPreventiviFunnel(preventivi, range), [preventivi, range]);

  const agingHeatmap = useMemo(() => buildClienteAgingHeatmap(invoices, anchor), [invoices, anchor]);

  const snapshotLabel = formatSnapshotDate(anchor);

  if (!canFatturazione && !canPreventivi) {
    return null;
  }

  if (loading) {
    return <div className="h-48 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />;
  }

  if (invoicesFailed && preventiviFailed) {
    return null;
  }

  const showInvoiceCharts = canFatturazione && !invoicesFailed;
  const showPreventiviCharts = canPreventivi && !preventiviFailed;

  if (!showInvoiceCharts && !showPreventiviCharts) {
    return null;
  }

  return (
    <div className="mt-4 space-y-4" data-testid="report-economia-charts-panel">
      {showInvoiceCharts ? (
        <>
          <ReportRevenueCollectionChart current={revenueSeries} compare={revenueCompareSeries} />
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <ReportArAgingChart points={arAgingPoints} />
            {showPreventiviCharts ? <ReportPreventiviFunnelChart rows={funnelRows} /> : null}
          </div>
          <ReportClienteAgingHeatmap
            rows={agingHeatmap}
            title={`Crediti aperti per cliente — fotografia al ${snapshotLabel}`}
          />
          <p className="text-xs text-[color:var(--cab-text-muted)]">
            La heatmap crediti è una fotografia allo stato attuale: non dipende dal periodo selezionato nella toolbar.
          </p>
        </>
      ) : showPreventiviCharts ? (
        <ReportPreventiviFunnelChart rows={funnelRows} />
      ) : null}
    </div>
  );
}
