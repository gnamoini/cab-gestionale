"use client";

import { useMemo } from "react";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { ReportPreventiviFunnelChart } from "@/components/report/primitives/chart/preventivi-funnel-chart";
import { buildPreventiviFunnel } from "@/lib/report/economic-analytics-extended";
import { usePreventiviRecordsQuery } from "@/src/hooks/gestionale/use-preventivi-records-query";
import { useRbac } from "@/src/hooks/use-rbac";

/** Funnel preventivi per sezione commerciale dedicata. */
export function ReportPreventiviChartsPanel() {
  const { range } = useReportPeriodContext();
  const { canReadPage, isLoading: rbacLoading } = useRbac();
  const canPreventivi = canReadPage("preventivi");
  const preventiviQ = usePreventiviRecordsQuery(canPreventivi);
  const preventivi = preventiviQ.isError ? [] : preventiviQ.records;
  const preventiviFailed = canPreventivi && !preventiviQ.isLoading && preventiviQ.isError;

  const funnelRows = useMemo(() => buildPreventiviFunnel(preventivi, range), [preventivi, range]);

  if (!canPreventivi) return null;
  if (rbacLoading || preventiviQ.isLoading) {
    return <div className="mt-4 h-40 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />;
  }
  if (preventiviFailed || funnelRows.length === 0) return null;

  return (
    <div className="mt-4" data-testid="report-preventivi-charts-panel">
      <ReportPreventiviFunnelChart rows={funnelRows} />
    </div>
  );
}
