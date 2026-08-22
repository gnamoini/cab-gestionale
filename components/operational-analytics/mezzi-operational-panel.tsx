"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { KpiPerformanceFleet as KpiPerformanceFleetPanel } from "@/components/report/kpi-performance/kpi-performance-fleet";
import { ReportDataTable } from "@/components/report/design-system";
import { buildReportSemanticIndex } from "@/lib/report/report-semantic-index";
import { useReportKpiPerformanceData } from "@/lib/report/kpi-performance/use-report-kpi-performance-data";
import { useOperationalLavorazioniData } from "@/lib/report/operational-module/use-operational-lavorazioni-data";
import { buildMtbfMttrByMezzo, listRecidivaMezzi } from "@/lib/report/lavorazioni-work-orders";
import { LoadingCardSkeleton } from "@/components/design-system";

const RecidivitaMezziPanel = dynamic(
  () =>
    import("@/components/operational-analytics/mezzi-recidivita-embed").then((m) => m.MezziRecidivitaEmbed),
  { ssr: false, loading: () => <LoadingCardSkeleton minHeightClass="min-h-[12rem]" /> },
);

/** Owner surface: flotta, recidività, MTBF — /mezzi */
export function MezziOperationalPanel() {
  const data = useOperationalLavorazioniData();

  const semanticIndex = useMemo(
    () =>
      buildReportSemanticIndex({
        completate: data.completate,
        manualByMonth: data.manualByMonth,
        mezzi: data.mezzi,
      }),
    [data.completate, data.manualByMonth, data.mezzi],
  );

  const { model: perf, isLoading: perfLoading } = useReportKpiPerformanceData({
    anchor: data.anchor,
    range: data.range,
    compareRange: null,
    live: data,
    semanticIndex,
    enabled: !data.isLoading,
  });

  const recidivaRows = useMemo(
    () => listRecidivaMezzi(data.completate, data.range),
    [data.completate, data.range],
  );

  const mtbfRows = useMemo(
    () =>
      buildMtbfMttrByMezzo(data.completate, data.range).map((r) => ({
        mezzo: r.mezzo,
        cliente: r.cliente,
        interventi: r.interventi,
        mttr: r.mttr,
        mtbf: r.mtbf == null ? "—" : r.mtbf,
      })),
    [data.completate, data.range],
  );

  if (data.isLoading || perfLoading) {
    return <LoadingCardSkeleton minHeightClass="min-h-[8rem]" />;
  }

  return (
    <ShellCard
      title="Analisi flotta"
      subtitle="Disponibilità, recidività e affidabilità"
      collapsible
      defaultCollapsed
      persistScope="mezzi"
      persistKey="operational-analytics"
      data-testid="mezzi-operational-panel"
    >
      <div className="min-w-0 space-y-4">
        {perf ? <KpiPerformanceFleetPanel data={perf.fleet} /> : null}
        {recidivaRows.length > 0 ? (
          <ReportDataTable configId="lav-recidiva" rows={recidivaRows} />
        ) : null}
        {mtbfRows.length > 0 ? (
          <ReportDataTable configId="lav-mtbf" rows={mtbfRows} />
        ) : (
          <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun dato MTBF/MTTR nel periodo.</p>
        )}
        <RecidivitaMezziPanel />
      </div>
    </ShellCard>
  );
}
