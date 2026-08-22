"use client";

import { useMemo } from "react";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { useReportDomainSnapshot } from "@/components/report/context/report-domain-snapshot-context";
import {
  useRegisterAnalyticsSection,
  useReportAnalyticsContext,
} from "@/components/report/analytics/report-analytics-provider";
import { ReportBarChart } from "@/components/report/design-system";
import { buildCrossCatenaValore } from "@/lib/report/cross-analysis/build-cross-breakdowns";
import { useInvoicesQuery } from "@/src/hooks/gestionale/use-invoices-query";
import { usePreventiviRecordsQuery } from "@/src/hooks/gestionale/use-preventivi-records-query";
import { useRbac } from "@/src/hooks/use-rbac";

/** Catena del valore — SSOT builder; engine envelopes registered for batching only. */
export function ReportCrossCatenaSection() {
  const { range } = useReportPeriodContext();
  const { completate } = useReportDomainSnapshot();
  const { canReadPage, isLoading: rbacLoading } = useRbac();
  const canFatturazione = canReadPage("fatturazione");
  const canPreventivi = canReadPage("preventivi");

  const invoicesQ = useInvoicesQuery(canFatturazione);
  const preventiviQ = usePreventiviRecordsQuery(canPreventivi);

  useRegisterAnalyticsSection("bi-cross-catena", "cross", {
    metricIds: ["eco_preventivi", "lav-chiusi", "eco_fatturato", "eco_incassato"],
    includeSeries: false,
  });

  const { isLoading: engineLoading } = useReportAnalyticsContext();

  const invoices = invoicesQ.isError ? [] : invoicesQ.invoices;
  const preventivi = preventiviQ.isError ? [] : preventiviQ.records;

  const catenaValore = useMemo(
    () =>
      buildCrossCatenaValore({
        preventivi,
        invoices,
        completate,
        range,
      }),
    [preventivi, invoices, completate, range],
  );

  const invoicesFailed = canFatturazione && !invoicesQ.isLoading && invoicesQ.isError;
  const preventiviFailed = canPreventivi && !preventiviQ.isLoading && preventiviQ.isError;

  const loading =
    rbacLoading ||
    engineLoading ||
    (canFatturazione && invoicesQ.isLoading) ||
    (canPreventivi && preventiviQ.isLoading);

  if (!canFatturazione && !canPreventivi) {
    return null;
  }

  if (loading) {
    return <div className="h-32 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />;
  }

  if (invoicesFailed && preventiviFailed) {
    return null;
  }

  if (!catenaValore.some((s) => s.value > 0)) {
    return (
      <p className="text-sm text-[color:var(--cab-text-muted)]" data-testid="report-cross-catena-section">
        Nessun dato nella catena del valore per il periodo.
      </p>
    );
  }

  return (
    <div data-testid="report-cross-catena-section">
      <ReportBarChart
        points={catenaValore.map((s) => ({ label: s.stage, value: s.value }))}
        title="Catena del valore"
      />
    </div>
  );
}
