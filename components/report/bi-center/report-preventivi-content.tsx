"use client";

import { useMemo } from "react";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { ReportPreventiviFunnelChart } from "@/components/report/primitives/chart/preventivi-funnel-chart";
import { ReportChartEmptyState } from "@/components/report/design-system";
import { buildPreventiviFunnel } from "@/lib/report/economic-analytics-extended";
import { usePreventiviRecordsQuery } from "@/src/hooks/gestionale/use-preventivi-records-query";
import { useRbac } from "@/src/hooks/use-rbac";

/** Preventivi accettazione breakdown — dumb content, no shell. */
export function ReportPreventiviAccettazioneChart() {
  const { range } = useReportPeriodContext();
  const { canReadPage, isLoading: rbacLoading } = useRbac();
  const canPreventivi = canReadPage("preventivi");
  const preventiviQ = usePreventiviRecordsQuery(canPreventivi);
  const preventivi = useMemo(
    () => (preventiviQ.isError ? [] : preventiviQ.records),
    [preventiviQ.isError, preventiviQ.records],
  );

  const funnelRows = useMemo(() => buildPreventiviFunnel(preventivi, range), [preventivi, range]);

  if (!canPreventivi) return null;
  if (rbacLoading || preventiviQ.isLoading) {
    return <div className="h-40 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />;
  }
  if (preventiviQ.isError) {
    return <ReportChartEmptyState reason="no_data" detail="Impossibile caricare i dati preventivi." />;
  }
  if (funnelRows.length === 0) {
    return <ReportChartEmptyState reason="no_data" detail="Nessun preventivo con decisione cliente nel periodo." />;
  }

  return (
    <div data-testid="report-preventivi-accettazione-chart">
      <ReportPreventiviFunnelChart rows={funnelRows} title="Preventivi per esito" />
    </div>
  );
}
