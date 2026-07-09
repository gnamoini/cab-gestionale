"use client";

import { useMemo } from "react";
import { KpiPerformanceFleet } from "@/components/report/kpi-performance/kpi-performance-fleet";
import { useReportPerformanceContext } from "@/components/report/layout/report-performance-context";
import { ReportUnifiedKpiGrid } from "@/components/report/design-system";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import { ReportDataTable, ReportEmbeddedModule, ReportSection } from "@/components/report/design-system";
import { LoadingSkeletonBlock } from "@/components/design-system/loading/loading-skeleton";

export default function ReportClientiMezziSectionView(props: DomainReportSectionProps) {
  const { perf, perfLoading, partitioned } = useReportPerformanceContext();

  const mezziRows = useMemo(
    () =>
      props.topsMezzi.map((r) => ({
        rank: r.rank,
        mezzo: r.mezzo,
        cliente: r.cliente,
        interventi: r.interventi,
      })),
    [props.topsMezzi],
  );

  const clientiRows = useMemo(
    () =>
      props.topsClienti.map((r) => ({
        rank: r.rank,
        cliente: r.cliente,
        interventi: r.interventi,
        ultimoIso: r.ultimoIso,
      })),
    [props.topsClienti],
  );

  return (
    <div className="min-w-0 space-y-4">
      {perfLoading || !perf ? (
        <LoadingSkeletonBlock className="min-h-[240px]" />
      ) : (
        <>
          <ReportSection
            id="report-cm-kpi"
            title="Indicatori flotta"
            subtitle="Disponibilità, fermi e guasti nel periodo"
          >
            <ReportUnifiedKpiGrid items={partitioned.fleet} />
          </ReportSection>

          <ReportSection
            id="report-cm-fleet"
            title="Flotta e disponibilità"
            subtitle="Stato mezzi in officina e disponibilità per cliente"
            defaultCollapsed={partitioned.fleet.length > 0}
          >
            <ReportEmbeddedModule label="Flotta">
              <KpiPerformanceFleet data={perf.fleet} />
            </ReportEmbeddedModule>
          </ReportSection>
        </>
      )}

      <ReportSection
        id="report-cm-classifiche"
        title="Classifiche operative"
        subtitle="Top mezzi e clienti nel periodo"
        defaultCollapsed
      >
        <ReportDataTable configId="top-mezzi" rows={mezziRows} />
        <div className="mt-4">
          <ReportDataTable configId="top-clienti-interventi" rows={clientiRows} />
        </div>
      </ReportSection>
    </div>
  );
}
