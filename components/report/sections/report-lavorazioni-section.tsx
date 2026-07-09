"use client";

import { KpiPerformanceFleet } from "@/components/report/kpi-performance/kpi-performance-fleet";
import { KpiPerformanceOperational } from "@/components/report/kpi-performance/kpi-performance-operational";
import { useReportPerformanceContext } from "@/components/report/layout/report-performance-gate";
import { ReportClassificheOperativePanel } from "@/components/report/report-classifiche-operative-panel";
import { ReportDomainMetricsGrid } from "@/components/report/report-domain-metrics-grid";
import { ReportLavorazioniSection } from "@/components/report/report-lavorazioni-section";
import { ReportLavorazioniTemporalSection } from "@/components/report/report-lavorazioni-temporal-section";
import { useReportAnalyticsDerived } from "@/components/report/report-analytics-derived-context";
import { useReportAnalyticsDerivedActions } from "@/components/report/report-analytics-derived-context";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import {
  reportSectionGroupDescClass,
  reportSubsectionTitleClass,
} from "@/components/report/report-ui-tokens";
import { usePublishWhenReady } from "@/components/report/sections/use-section-publish";
import { LoadingSkeletonBlock } from "@/components/design-system/loading/loading-skeleton";

export default function ReportLavorazioniSectionView(props: DomainReportSectionProps) {
  const { perf, perfLoading } = useReportPerformanceContext();
  const derived = useReportAnalyticsDerived();
  const { publishOperationalAnalytics } = useReportAnalyticsDerivedActions();

  usePublishWhenReady(
    props.fetchEnabled,
    [
      props.rangeKey,
      props.attive,
      props.storico,
      props.completate,
      props.lavListRows,
      props.manualByMonth,
    ],
    (requestId) => {
      publishOperationalAnalytics({
        rangeKey: props.rangeKey,
        requestId,
        range: props.range,
        attive: props.attive,
        storico: props.storico,
        completate: props.completate,
        lavRows: props.lavListRows,
        manualByMonth: props.manualByMonth,
      });
    },
  );

  const metrics = derived.operational?.data.metrics ?? [];

  return (
    <div className="min-w-0 space-y-8">
      <ReportDomainMetricsGrid metrics={metrics} />

      {perfLoading || !perf ? (
        <LoadingSkeletonBlock className="min-h-[200px]" />
      ) : (
        <>
          <section className="min-w-0 space-y-4" aria-labelledby="report-lav-operational">
            <div>
              <h3 id="report-lav-operational" className={reportSubsectionTitleClass}>
                Andamento interventi
              </h3>
              <p className={`mt-1 ${reportSectionGroupDescClass}`}>
                Chiusure nel periodo e segnali operativi.
              </p>
            </div>
            <KpiPerformanceOperational data={perf.operational} />
          </section>

          <section className="min-w-0 space-y-4 border-t border-[color:var(--cab-border)] pt-8" aria-labelledby="report-lav-fleet">
            <div>
              <h3 id="report-lav-fleet" className={reportSubsectionTitleClass}>
                Flotta e disponibilità
              </h3>
            </div>
            <KpiPerformanceFleet data={perf.fleet} />
          </section>
        </>
      )}

      <section className="min-w-0 space-y-3 border-t border-[color:var(--cab-border)] pt-8">
        <h3 className={reportSubsectionTitleClass}>Ritmo mensile</h3>
        <ReportLavorazioniTemporalSection
          filterRange={props.range}
          anchor={props.anchor}
          semanticIndex={props.semanticIndex}
          embed
          showKpiChart
          showTable={false}
        />
      </section>

      <section className="min-w-0 space-y-3 border-t border-[color:var(--cab-border)] pt-8">
        <h3 className={reportSubsectionTitleClass}>Matrice lavorazioni</h3>
        <ReportLavorazioniSection
          attive={props.attive}
          completate={props.completate}
          manualEntries={props.manualEntries}
          anchor={props.anchor}
          filterRange={props.range}
          compareDetail={props.compareDetail}
          semanticIndex={props.semanticIndex}
        />
      </section>

      <section className="min-w-0 space-y-3 border-t border-[color:var(--cab-border)] pt-8">
        <h3 className={reportSubsectionTitleClass}>Classifiche operative</h3>
        <ReportClassificheOperativePanel
          mezzi={props.topsMezzi}
          clienti={props.topsClienti}
          showCompare={props.showCompare}
        />
      </section>
    </div>
  );
}
