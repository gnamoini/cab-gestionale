"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import {
  ReportBarChart,
  ReportChartEmptyState,
  ReportDataTable,
  ReportEmbeddedModule,
  ReportLayoutDetail,
  ReportStorySection,
} from "@/components/report/design-system";
import { useReportDomainSnapshot } from "@/components/report/context/report-domain-snapshot-context";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { aggregateOrePerDipendente, aggregateOrePerDipendenteDetailed } from "@/lib/report/timesheet-ore-ranking";
import { useReportTimesheetKpi } from "@/src/hooks/use-report-timesheet-kpi";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import { buildReportRangeKey } from "@/lib/report/report-domain-types";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";
import ReportAnalisiOreOfficinaSectionView from "@/components/report/sections/report-analisi-ore-officina-section";
import { getReportStoryCopy } from "@/lib/report/ui/report-copy";
import { resolveChartLayout } from "@/lib/report/ui/report-layout-rules";

const ReportRisorseSection = dynamic(() =>
  import("@/components/report/bi-center/report-domain-sections").then((m) => m.ReportRisorseSection),
);

export function ReportAreaDipendentiView() {
  const data = useReportDomainSnapshot();
  const period = useReportPeriodContext();
  const timesheet = useReportTimesheetKpi(period.range);

  const lavIds = useMemo(() => data.completate.map((c) => c.id), [data.completate]);
  const schedeQ = useSchedeBundlesQuery(true, { lavorazioneIds: lavIds });

  const orePerDipendente = useMemo(
    () => aggregateOrePerDipendente(timesheet.entries, timesheet.employees),
    [timesheet.entries, timesheet.employees],
  );

  const oreChartPoints = useMemo(
    () => orePerDipendente.slice(0, 8).map((r) => ({ label: r.dipendente, value: r.ore })),
    [orePerDipendente],
  );

  const oreTableRows = useMemo(
    () => aggregateOrePerDipendenteDetailed(timesheet.entries, timesheet.employees),
    [timesheet.entries, timesheet.employees],
  );

  const chartLayout = resolveChartLayout({
    chartType: "horizontalBar",
    categoryCount: oreChartPoints.length,
  });

  const analisiOreProps: DomainReportSectionProps = {
    sectionId: "analisi_ore_officina",
    fetchEnabled: true,
    range: data.range,
    compareRange: data.compareRange,
    rangeKey: buildReportRangeKey(data.range, data.compareRange),
    anchor: data.anchor,
    compareDetail: data.compareDetail,
    semanticIndex: data.semanticIndex,
    derivedBundle: data.derivedBundle,
    attive: data.attive,
    storico: data.storico,
    completate: data.completate,
    manualEntries: [],
    prodotti: data.magazzino,
    histRev: data.histRev,
    onHistRev: data.onHistRev,
    topsMezzi: data.tops.mezzi,
    topsClienti: data.tops.clienti,
    topsRicambi: data.tops.ricambi,
    showCompare: data.showCompare,
    manualByMonth: data.manualByMonth,
    lavListRows: data.lavListRows,
    magLog: data.magLog,
    magazzinoRows: data.magazzinoRows,
    costoOrario: data.costoOrario,
    schedeStore: schedeQ.store ?? data.schedeStore,
    schedeLoaded: !schedeQ.isLoading,
    analyticsContext: {
      perf: null,
      perfLoading: false,
      partitioned: { lavorazioni: [], fleet: [], magazzino: [], economic: [] },
      compareMode: period.compareMode,
    },
  };

  const situazione = getReportStoryCopy("dip-situazione");
  const andamento = getReportStoryCopy("dip-andamento");
  const officina = getReportStoryCopy("dip-officina");

  return (
    <div className="min-w-0" data-testid="report-area-dipendenti">
      <ReportStorySection
        title={situazione.title}
        subtitle={situazione.subtitle}
        testId="report-story-dip-situazione"
        showDivider={false}
      >
        <ReportLayoutDetail>
          <ReportRisorseSection />
        </ReportLayoutDetail>
      </ReportStorySection>

      <ReportStorySection title={andamento.title} subtitle={andamento.subtitle} testId="report-story-dip-andamento">
        {oreChartPoints.length > 0 ? (
          <div className={chartLayout.minHeightClass}>
            <ReportBarChart points={oreChartPoints} title="Chi ha lavorato di più nel periodo" />
          </div>
        ) : (
          <ReportChartEmptyState reason="no_data" detail="Nessuna ora registrata nel periodo." />
        )}
        {oreTableRows.length > 0 ? (
          <div className="mt-4">
            <ReportDataTable configId="ore-per-dipendente" rows={oreTableRows} />
          </div>
        ) : null}
      </ReportStorySection>

      <ReportStorySection title={officina.title} subtitle={officina.subtitle} testId="report-story-dip-officina">
        <ReportEmbeddedModule>
          <ReportAnalisiOreOfficinaSectionView {...analisiOreProps} />
        </ReportEmbeddedModule>
      </ReportStorySection>
    </div>
  );
}
