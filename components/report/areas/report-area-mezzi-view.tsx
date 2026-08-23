"use client";

import { useMemo } from "react";
import { KpiPerformanceFleet as KpiPerformanceFleetPanel } from "@/components/report/kpi-performance/kpi-performance-fleet";
import {
  ReportChartEmptyState,
  ReportDataTable,
  ReportEmbeddedModule,
  ReportLayoutDetail,
  ReportStorySection,
} from "@/components/report/design-system";
import { useReportDomainSnapshot } from "@/components/report/context/report-domain-snapshot-context";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { useReportKpiPerformanceData } from "@/lib/report/kpi-performance/use-report-kpi-performance-data";
import { buildMtbfMttrByMezzo, listRecidivaMezzi } from "@/lib/report/lavorazioni-work-orders";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import { buildReportRangeKey } from "@/lib/report/report-domain-types";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";
import ReportRecidivitaMezziSectionView from "@/components/report/sections/report-recidivita-mezzi-section";
import { getReportStoryCopy } from "@/lib/report/ui/report-copy";

export function ReportAreaMezziView() {
  const data = useReportDomainSnapshot();
  const period = useReportPeriodContext();

  const { model: perf, isLoading: perfLoading } = useReportKpiPerformanceData({
    anchor: data.anchor,
    range: data.range,
    compareRange: data.compareRange,
    live: {
      attive: data.attive,
      completate: data.completate,
      magazzino: data.magazzino,
      magLog: data.magLog,
      mezzi: data.mezzi,
      lavListRows: [...data.lavListRows],
      isLoading: false,
    },
    semanticIndex: data.semanticIndex,
    enabled: true,
  });

  const lavIds = useMemo(() => data.completate.map((c) => c.id), [data.completate]);
  const schedeQ = useSchedeBundlesQuery(true, { lavorazioneIds: lavIds });

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

  const recidivitaProps: DomainReportSectionProps = {
    sectionId: "recidivita_mezzi",
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
      perf: perf ?? null,
      perfLoading,
      partitioned: { lavorazioni: [], fleet: [], magazzino: [], economic: [] },
      compareMode: period.compareMode,
    },
  };

  const situazione = getReportStoryCopy("mez-situazione");
  const guasti = getReportStoryCopy("mez-guasti");
  const dettaglio = getReportStoryCopy("mez-dettaglio");

  return (
    <div className="min-w-0" data-testid="report-area-mezzi">
      <ReportStorySection
        title={situazione.title}
        subtitle={situazione.subtitle}
        testId="report-story-mez-situazione"
        showDivider={false}
      >
        <ReportLayoutDetail>
          {perf && !perfLoading ? (
            <KpiPerformanceFleetPanel data={perf.fleet} />
          ) : (
            <ReportChartEmptyState reason={perfLoading ? "no_data" : "no_data"} detail="Caricamento dati flotta…" />
          )}
        </ReportLayoutDetail>
      </ReportStorySection>

      <ReportStorySection title={guasti.title} subtitle={guasti.subtitle} testId="report-story-mez-guasti">
        {recidivaRows.length > 0 ? (
          <ReportDataTable configId="lav-recidiva" rows={recidivaRows} />
        ) : (
          <ReportChartEmptyState reason="no_data" detail="Nessun mezzo con guasti ripetuti nel periodo." />
        )}
        {mtbfRows.length > 0 ? (
          <div className="mt-4">
            <ReportDataTable configId="lav-mtbf" rows={mtbfRows} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-[color:var(--cab-text-muted)]">
            Non ci sono dati sufficienti sul tempo medio tra due guasti nel periodo.
          </p>
        )}
      </ReportStorySection>

      <ReportStorySection title={dettaglio.title} subtitle={dettaglio.subtitle} testId="report-story-mez-dettaglio">
        <ReportEmbeddedModule>
          <ReportRecidivitaMezziSectionView {...recidivitaProps} />
        </ReportEmbeddedModule>
      </ReportStorySection>
    </div>
  );
}
