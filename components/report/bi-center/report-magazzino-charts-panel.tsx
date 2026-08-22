"use client";

import { useMemo } from "react";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { useRegisterAnalyticsSection } from "@/components/report/analytics/report-analytics-provider";
import { ReportDataTable } from "@/components/report/design-system";
import { buildOrdiniFornitoriReportRows } from "@/lib/report/magazzino-analytics";
import { useOrdiniFornitoriQuery } from "@/src/hooks/gestionale/use-ordini-fornitori-query";
import { LoadingErrorState } from "@/components/design-system";

/** Magazzino advanced panel — ordini fornitori via SSOT builder (mag_orders drill-down metric registered). */
export function ReportMagazzinoChartsPanel() {
  const { range, anchor } = useReportPeriodContext();
  const ordiniQ = useOrdiniFornitoriQuery(true);

  useRegisterAnalyticsSection("bi-magazzino-charts", "magazzino", {
    metricIds: ["mag_orders"],
    includeSeries: false,
  });

  const ordiniRows = useMemo(
    () =>
      buildOrdiniFornitoriReportRows(ordiniQ.records, range, anchor, true).map((r) => ({
        ...r,
        id: r.id,
      })),
    [ordiniQ.records, range, anchor],
  );

  if (ordiniQ.isLoading) {
    return <div className="h-32 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />;
  }

  if (ordiniQ.isError) {
    return (
      <LoadingErrorState
        title="Ordini fornitori non disponibili"
        description="Impossibile caricare gli ordini."
        onRetry={() => void ordiniQ.refetch()}
      />
    );
  }

  if (ordiniRows.length === 0) {
    return (
      <p className="mt-4 text-sm text-[color:var(--cab-text-muted)]" data-testid="report-magazzino-charts-panel">
        Nessun ordine fornitore nel periodo.
      </p>
    );
  }

  return (
    <div className="mt-4 min-w-0" data-testid="report-magazzino-charts-panel">
      <ReportDataTable configId="ordini-fornitori" rows={ordiniRows} />
    </div>
  );
}
