"use client";

import { KpiPerformanceEconomic } from "@/components/report/kpi-performance/kpi-performance-economic";
import { useReportPerformanceContext } from "@/components/report/layout/report-performance-gate";
import {
  useReportAnalyticsDerived,
  useReportAnalyticsDerivedActions,
} from "@/components/report/report-analytics-derived-context";
import { ReportDomainMetricsGrid } from "@/components/report/report-domain-metrics-grid";
import { ReportMagazzinoSection } from "@/components/report/report-magazzino-section";
import { ReportRicambiConsumoSection } from "@/components/report/report-ricambi-consumo-section";
import { ReportTopRicambi } from "@/components/report/report-tops";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import { usePublishWhenReady } from "@/components/report/sections/use-section-publish";
import { reportSubsectionTitleClass } from "@/components/report/report-ui-tokens";
import { useOrdiniFornitoriQuery } from "@/src/hooks/gestionale/use-ordini-fornitori-query";
import { LoadingSkeletonBlock } from "@/components/design-system/loading/loading-skeleton";

export default function ReportMagazzinoSectionView(props: DomainReportSectionProps) {
  const { perf, perfLoading } = useReportPerformanceContext();
  const derived = useReportAnalyticsDerived();
  const { publishWarehouseAnalytics } = useReportAnalyticsDerivedActions();
  const ordiniQ = useOrdiniFornitoriQuery(props.fetchEnabled);

  usePublishWhenReady(
    props.fetchEnabled && !ordiniQ.isLoading,
    [
      props.rangeKey,
      props.derivedBundle.magLogSorted,
      props.prodotti,
      props.magazzinoRows,
      ordiniQ.records,
      ordiniQ.isError,
    ],
    (requestId) => {
      if (ordiniQ.isError) return;
      publishWarehouseAnalytics({
        rangeKey: props.rangeKey,
        requestId,
        range: props.range,
        magLog: props.magLog,
        magazzino: props.prodotti,
        magazzinoRows: props.magazzinoRows,
        ordini: ordiniQ.records,
      });
    },
  );

  const metrics =
    derived.warehouse?.data.metrics.map((m) => {
      if (ordiniQ.isError && m.id === "mag_orders") {
        return {
          ...m,
          state: {
            status: "error" as const,
            message: "Impossibile caricare gli ordini fornitori",
            retry: () => void ordiniQ.refetch(),
          },
        };
      }
      if (ordiniQ.isLoading && m.id === "mag_orders") {
        return { ...m, state: { status: "loading" as const } };
      }
      return m;
    }) ?? [];

  return (
    <div className="min-w-0 space-y-8">
      <ReportDomainMetricsGrid metrics={metrics} />

      {perfLoading || !perf ? (
        <LoadingSkeletonBlock className="min-h-[160px]" />
      ) : (
        <section className="min-w-0 space-y-4">
          <h3 className={reportSubsectionTitleClass}>Economia magazzino</h3>
          <KpiPerformanceEconomic data={perf.economic} />
        </section>
      )}

      <section className="min-w-0 space-y-3 border-t border-[color:var(--cab-border)] pt-8">
        <h3 className={reportSubsectionTitleClass}>Movimenti e stock</h3>
        <ReportMagazzinoSection
          derivedBundle={props.derivedBundle}
          prodotti={props.prodotti}
          anchor={props.anchor}
          range={props.range}
          compareDetail={props.compareDetail}
          histRev={props.histRev}
          onHistRev={props.onHistRev}
        />
      </section>

      <section className="min-w-0 space-y-3 border-t border-[color:var(--cab-border)] pt-8">
        <h3 className={reportSubsectionTitleClass}>Consumo ricambi</h3>
        <ReportRicambiConsumoSection
          magLogSorted={props.derivedBundle.magLogSorted}
          prodotti={props.prodotti}
          filterRange={props.range}
          anchor={props.anchor}
        />
      </section>

      {props.topsRicambi.length > 0 ? (
        <section className="min-w-0 space-y-3 border-t border-[color:var(--cab-border)] pt-8">
          <h3 className={reportSubsectionTitleClass}>Top ricambi</h3>
          <ReportTopRicambi rows={props.topsRicambi} showCompare={props.showCompare} />
        </section>
      ) : null}
    </div>
  );
}
