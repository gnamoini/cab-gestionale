"use client";

import {
  useReportAnalyticsDerived,
  useReportAnalyticsDerivedActions,
} from "@/components/report/report-analytics-derived-context";
import { ReportMagazzinoSection } from "@/components/report/report-magazzino-section";
import { ReportRicambiConsumoSection } from "@/components/report/report-ricambi-consumo-section";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import {
  ReportDataTable,
  ReportDomainMetricsGrid,
  ReportBarChart,
  ReportMatrix,
  ReportSection,
} from "@/components/report/design-system";
import { usePublishWhenReady } from "@/components/report/sections/use-section-publish";
import { useOrdiniFornitoriQuery } from "@/src/hooks/gestionale/use-ordini-fornitori-query";
import { getMagazzinoMonthlyRowsForRange } from "@/lib/report/report-derived-cache";
import { useMemo } from "react";

export default function ReportMagazzinoSectionView(props: DomainReportSectionProps) {
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
        compareRange: props.showCompare ? props.compareRange : null,
        compareMode: props.analyticsContext.compareMode,
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

  const topRicambiRows = useMemo(
    () =>
      props.topsRicambi.map((r) => ({
        rank: r.rank,
        codice: r.codice,
        nome: r.nome,
        qtaEntrata: r.qtaEntrata,
        qtaUscita: r.qtaUscita,
      })),
    [props.topsRicambi],
  );

  const movementChartPoints = useMemo(() => {
    const { rows } = getMagazzinoMonthlyRowsForRange(
      props.derivedBundle,
      props.prodotti,
      props.range,
      props.anchor,
      {},
    );
    return rows.map((r) => ({ label: r.label, value: r.entrate + r.uscite }));
  }, [props.derivedBundle, props.prodotti, props.range, props.anchor]);

  return (
    <div className="min-w-0 space-y-4">
      <ReportSection id="report-mag-kpi" title="Indicatori magazzino" subtitle="KPI stock e movimenti">
        <ReportDomainMetricsGrid metrics={metrics} compareMode={props.analyticsContext.compareMode} />
      </ReportSection>

      {movementChartPoints.length > 0 ? (
        <ReportSection id="report-mag-chart" title="Andamento movimenti" subtitle="Saldo netto mensile" defaultCollapsed>
          <ReportBarChart points={movementChartPoints} title="Movimenti netti" />
        </ReportSection>
      ) : (
        <ReportSection id="report-mag-chart" title="Andamento movimenti" subtitle="Saldo netto mensile" defaultCollapsed>
          <ReportBarChart points={[]} title="Movimenti netti" />
        </ReportSection>
      )}

      <ReportSection
        id="report-mag-movements"
        title="Movimenti e stock"
        subtitle="Tabella mensile, grafici entrate/uscite"
        defaultCollapsed
      >
        <ReportMatrix title="Movimenti mensili">
          <ReportMagazzinoSection
            derivedBundle={props.derivedBundle}
            prodotti={props.prodotti}
            anchor={props.anchor}
            range={props.range}
            compareDetail={props.compareDetail}
            histRev={props.histRev}
            onHistRev={props.onHistRev}
            embed
          />
        </ReportMatrix>
      </ReportSection>

      <ReportSection
        id="report-mag-consumo"
        title="Consumo ricambi"
        subtitle="Ranking consumi per periodo, mese o anno"
        defaultCollapsed
      >
        <ReportRicambiConsumoSection
          magLogSorted={props.derivedBundle.magLogSorted}
          prodotti={props.prodotti}
          filterRange={props.range}
          anchor={props.anchor}
          embed
        />
      </ReportSection>

      {topRicambiRows.length > 0 ? (
        <ReportSection id="report-mag-top" title="Top ricambi" subtitle="Maggior movimentazione nel periodo" defaultCollapsed>
          <ReportDataTable configId="top-ricambi" rows={topRicambiRows} />
        </ReportSection>
      ) : (
        <ReportSection id="report-mag-top" title="Top ricambi" subtitle="Maggior movimentazione nel periodo" defaultCollapsed>
          <ReportDataTable configId="top-ricambi" rows={[]} />
        </ReportSection>
      )}
    </div>
  );
}
