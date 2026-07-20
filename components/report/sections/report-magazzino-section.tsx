"use client";

import {
  useReportAnalyticsDerived,
  useReportAnalyticsDerivedActions,
} from "@/components/report/report-analytics-derived-context";
import { useReportPerformanceContext } from "@/components/report/layout/report-performance-context";
import { ReportMagazzinoSection } from "@/components/report/report-magazzino-section";
import { ReportRicambiConsumoSection } from "@/components/report/report-ricambi-consumo-section";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import { ReportDataTable, ReportMatrix, ReportSection } from "@/components/report/design-system";
import { usePublishWhenReady } from "@/components/report/sections/use-section-publish";
import { useOrdiniFornitoriQuery } from "@/src/hooks/gestionale/use-ordini-fornitori-query";
import { ReportMagazzinoStockAlerts } from "@/components/report/layout/report-magazzino-stock-alerts";
import { ReportMagazzinoHeroKpiSection } from "@/components/report/layout/report-magazzino-hero-kpi-section";
import { MagazzinoCapitalLineChart, MagazzinoEntrateUsciteStackedBars } from "@/components/report/report-charts";
import { MagazzinoCategoryDonutChart } from "@/components/report/primitives/chart/magazzino-category-donut-chart";
import { MagazzinoParetoChart } from "@/components/report/primitives/chart/magazzino-pareto-chart";
import { ReportVisualization } from "@/components/report/design-system/layout/visualization";
import {
  buildMagazzinoCoperturaBassaRows,
  buildMagazzinoStockRiskRows,
  buildOrdiniFornitoriReportRows,
  buildParetoConsumi,
  buildRischioCategoriaMatrix,
  buildStockValueByCategory,
  countCoperturaCritica,
  MAG_COVERAGE_CRITICAL_DAYS,
} from "@/lib/report/magazzino-analytics";
import { buildMagazzinoSupplementaryKpiItems } from "@/lib/report/magazzino-supplementary-kpis";
import { getMagazzinoMonthlyRowsForRange } from "@/lib/report/report-derived-cache";
import type { KpiPerformanceAlert } from "@/lib/report/kpi-performance/kpi-performance-types";
import { useMemo } from "react";

const ORDINE_STATUS_LABEL: Record<string, string> = {
  bozza: "Bozza",
  inviato: "Inviato",
  confermato: "Confermato",
  spedito: "Spedito",
  ricevuto: "Ricevuto",
  annullato: "Annullato",
};

export default function ReportMagazzinoSectionView(props: DomainReportSectionProps) {
  const derived = useReportAnalyticsDerived();
  const { partitioned, perf } = useReportPerformanceContext();
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

  const supplementaryKpis = useMemo(
    () =>
      buildMagazzinoSupplementaryKpiItems({
        prodotti: props.prodotti,
        magLog: props.derivedBundle.magLogSorted,
        range: props.range,
        anchor: props.anchor,
      }),
    [props.prodotti, props.derivedBundle.magLogSorted, props.range, props.anchor],
  );

  const monthlyRows = useMemo(() => {
    const { rows } = getMagazzinoMonthlyRowsForRange(
      props.derivedBundle,
      props.prodotti,
      props.range,
      props.anchor,
      {},
    );
    return rows;
  }, [props.derivedBundle, props.prodotti, props.range, props.anchor]);

  const movementChartRows = useMemo(
    () => monthlyRows.map((r) => ({ label: r.label, entrate: r.entrate, uscite: r.uscite })),
    [monthlyRows],
  );

  const capitalChartRows = useMemo(
    () => monthlyRows.map((r) => ({ label: r.label, capitaleFinale: r.capitaleFinale })),
    [monthlyRows],
  );

  const sottoScortaRows = useMemo(
    () =>
      buildMagazzinoStockRiskRows(props.prodotti, props.magLog, props.range).map((r) => ({
        codice: r.codice,
        marca: r.marca,
        nome: r.nome,
        qty: r.qty,
        scortaMin: r.scortaMin,
        delta: r.delta,
        valoreRischio: r.valoreRischio,
      })),
    [props.prodotti, props.magLog, props.range],
  );

  const coperturaRows = useMemo(
    () =>
      buildMagazzinoCoperturaBassaRows(props.prodotti, props.magLog, props.range).map((r) => ({
        codice: r.codice,
        marca: r.marca,
        nome: r.nome,
        qty: r.qty,
        giorniCopertura: r.giorniCopertura == null ? "—" : String(r.giorniCopertura),
      })),
    [props.prodotti, props.magLog, props.range],
  );

  const categorySlices = useMemo(() => buildStockValueByCategory(props.prodotti), [props.prodotti]);

  const paretoRows = useMemo(
    () => buildParetoConsumi(props.derivedBundle.magLogSorted, props.prodotti, props.range),
    [props.derivedBundle.magLogSorted, props.prodotti, props.range],
  );

  const rischioMatrixRows = useMemo(
    () => buildRischioCategoriaMatrix(props.prodotti, props.magLog, props.range, props.anchor),
    [props.prodotti, props.magLog, props.range, props.anchor],
  );

  const ordiniRows = useMemo(
    () =>
      buildOrdiniFornitoriReportRows(ordiniQ.records, props.range, props.anchor, true).map((r) => ({
        numero: r.numero,
        fornitore: r.fornitore,
        dataOrdine: r.dataOrdine,
        status: ORDINE_STATUS_LABEL[r.status] ?? r.status,
        totale: r.totale,
        giorniAperti: r.giorniAperti,
      })),
    [ordiniQ.records, props.range, props.anchor],
  );

  const extraAlerts = useMemo((): KpiPerformanceAlert[] => {
    const out: KpiPerformanceAlert[] = [];
    const crit = countCoperturaCritica(props.prodotti, props.magLog, props.range);
    if (crit > 0) {
      out.push({
        id: "copertura-critica",
        severity: "warning",
        title: `${crit} articoli con copertura critica`,
        detail: `Giorni di copertura stimati sotto ${MAG_COVERAGE_CRITICAL_DAYS} giorni.`,
      });
    }
    const dead = supplementaryKpis.find((k) => k.id === "mag-dead-stock");
    const deadN = dead ? Number.parseInt(dead.value, 10) : 0;
    if (deadN > 0) {
      out.push({
        id: "dead-stock",
        severity: "info",
        title: `${deadN} articoli fermi`,
        detail: "Giacenza senza uscite negli ultimi 90 giorni — valutare smaltimento o promozione.",
      });
    }
    return out;
  }, [props.prodotti, props.magLog, props.range, supplementaryKpis]);

  return (
    <div className="min-w-0 space-y-4">
      <ReportSection id="report-mag-kpi" title="Indicatori magazzino" subtitle="KPI stock e movimenti">
        {perf?.alerts ? (
          <ReportMagazzinoStockAlerts alerts={perf.alerts} extraAlerts={extraAlerts} />
        ) : extraAlerts.length > 0 ? (
          <ReportMagazzinoStockAlerts alerts={[]} extraAlerts={extraAlerts} />
        ) : null}
        <ReportMagazzinoHeroKpiSection
          unifiedItems={partitioned.magazzino}
          supplementaryItems={supplementaryKpis}
          domainMetrics={metrics}
          compareMode={props.analyticsContext.compareMode}
        />
      </ReportSection>

      <ReportSection id="report-mag-overview" title="Overview movimenti" subtitle="Flussi mensili e capitale immobilizzato">
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <ReportVisualization title="Entrate e uscite mensili">
            {movementChartRows.length > 0 ? (
              <MagazzinoEntrateUsciteStackedBars rows={movementChartRows} />
            ) : (
              <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun movimento nel periodo.</p>
            )}
          </ReportVisualization>
          <ReportVisualization title="Capitale immobilizzato">
            {capitalChartRows.length > 0 ? (
              <MagazzinoCapitalLineChart rows={capitalChartRows} />
            ) : (
              <p className="text-sm text-[color:var(--cab-text-muted)]">Dati capitale non disponibili.</p>
            )}
          </ReportVisualization>
        </div>
      </ReportSection>

      <ReportSection id="report-mag-analisi" title="Analisi" subtitle="Composizione stock e consumi" defaultCollapsed>
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <ReportVisualization title="Stock per categoria">
            <MagazzinoCategoryDonutChart slices={categorySlices} />
          </ReportVisualization>
          <ReportVisualization title="Pareto consumi (top 20)">
            <MagazzinoParetoChart rows={paretoRows} />
          </ReportVisualization>
        </div>
        {rischioMatrixRows.length > 0 ? (
          <div className="mt-4">
            <ReportDataTable configId="magazzino-rischio-matrix" rows={rischioMatrixRows} />
          </div>
        ) : null}
      </ReportSection>

      <ReportSection
        id="report-mag-stock-risk"
        title="Stock e rischio"
        subtitle="Sotto scorta e giorni di copertura stimati"
        defaultCollapsed
      >
        <ReportDataTable configId="sotto-scorta-min" rows={sottoScortaRows} />
        {coperturaRows.length > 0 ? (
          <div className="mt-4">
            <ReportDataTable configId="copertura-bassa" rows={coperturaRows} />
          </div>
        ) : null}
      </ReportSection>

      <ReportSection
        id="report-mag-movements"
        title="Movimenti e stock"
        subtitle="Tabella mensile e storico manuale"
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
            chartsInParent
          />
        </ReportMatrix>
      </ReportSection>

      <ReportSection
        id="report-mag-consumo"
        title="Ranking ricambi"
        subtitle="Movimentazione, consumi e copertura nel periodo"
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

      {ordiniRows.length > 0 ? (
        <ReportSection id="report-mag-ordini" title="Ordini fornitori aperti" subtitle="Pipeline approvvigionamento" defaultCollapsed>
          <ReportDataTable configId="ordini-fornitori" rows={ordiniRows} />
        </ReportSection>
      ) : null}
    </div>
  );
}
