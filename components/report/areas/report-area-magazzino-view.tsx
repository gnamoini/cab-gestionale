"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { ReportMagazzinoSection } from "@/components/report/report-magazzino-section";
import { ReportRicambiConsumoSection } from "@/components/report/report-ricambi-consumo-section";
import {
  ReportChartEmptyState,
  ReportDataTable,
  ReportEmbeddedModule,
  ReportLayoutSplit,
  ReportStorySection,
} from "@/components/report/design-system";
import { MagazzinoCategoryDonutChart } from "@/components/report/primitives/chart/magazzino-category-donut-chart";
import { MagazzinoParetoChart } from "@/components/report/primitives/chart/magazzino-pareto-chart";
import { useReportDomainSnapshot } from "@/components/report/context/report-domain-snapshot-context";
import {
  buildMagazzinoCoperturaBassaRows,
  buildMagazzinoStockRiskRows,
  buildParetoConsumi,
  buildRischioCategoriaMatrix,
  buildStockValueByCategory,
} from "@/lib/report/magazzino-analytics";
import { getReportStoryCopy } from "@/lib/report/ui/report-copy";

const ReportMagazzinoBiSection = dynamic(() =>
  import("@/components/report/bi-center/report-domain-sections").then((m) => m.ReportMagazzinoBiSection),
);

export function ReportAreaMagazzinoView() {
  const data = useReportDomainSnapshot();

  const sottoScortaRows = useMemo(
    () =>
      buildMagazzinoStockRiskRows(data.magazzino, data.magLog, data.range).map((r) => ({
        codice: r.codice,
        marca: r.marca,
        nome: r.nome,
        qty: r.qty,
        scortaMin: r.scortaMin,
        delta: r.delta,
        valoreRischio: r.valoreRischio,
      })),
    [data.magazzino, data.magLog, data.range],
  );

  const coperturaRows = useMemo(
    () =>
      buildMagazzinoCoperturaBassaRows(data.magazzino, data.magLog, data.range).map((r) => ({
        codice: r.codice,
        marca: r.marca,
        nome: r.nome,
        qty: r.qty,
        giorniCopertura: r.giorniCopertura == null ? "—" : String(r.giorniCopertura),
      })),
    [data.magazzino, data.magLog, data.range],
  );

  const categorySlices = useMemo(() => buildStockValueByCategory(data.magazzino), [data.magazzino]);

  const paretoRows = useMemo(
    () => buildParetoConsumi(data.derivedBundle.magLogSorted, data.magazzino, data.range),
    [data.derivedBundle.magLogSorted, data.magazzino, data.range],
  );

  const rischioMatrixRows = useMemo(
    () => buildRischioCategoriaMatrix(data.magazzino, data.magLog, data.range, data.anchor),
    [data.magazzino, data.magLog, data.range, data.anchor],
  );

  const situazione = getReportStoryCopy("mag-situazione");
  const distribuzione = getReportStoryCopy("mag-distribuzione");
  const criticita = getReportStoryCopy("mag-criticita");
  const dettaglio = getReportStoryCopy("mag-dettaglio");

  return (
    <div className="min-w-0" data-testid="report-area-magazzino">
      <ReportStorySection
        title={situazione.title}
        subtitle={situazione.subtitle}
        testId="report-story-mag-situazione"
        showDivider={false}
      >
        <ReportMagazzinoBiSection />
      </ReportStorySection>

      <ReportStorySection
        title={distribuzione.title}
        subtitle={distribuzione.subtitle}
        testId="report-story-mag-distribuzione"
      >
        {categorySlices.length > 0 ? (
          <MagazzinoCategoryDonutChart slices={categorySlices} />
        ) : (
          <ReportChartEmptyState reason="no_data" />
        )}
        <div className="mt-4">
          {paretoRows.length > 0 ? (
            <MagazzinoParetoChart rows={paretoRows} />
          ) : (
            <ReportChartEmptyState reason="no_data" detail="Nessun consumo nel periodo." />
          )}
        </div>
      </ReportStorySection>

      <ReportStorySection title={criticita.title} subtitle={criticita.subtitle} testId="report-story-mag-criticita">
        <ReportLayoutSplit
          left={
            sottoScortaRows.length > 0 ? (
              <ReportDataTable configId="sotto-scorta-min" rows={sottoScortaRows} />
            ) : (
              <ReportChartEmptyState reason="no_data" detail="Nessun articolo sotto scorta minima." />
            )
          }
          right={
            coperturaRows.length > 0 ? (
              <ReportDataTable configId="copertura-bassa" rows={coperturaRows} />
            ) : (
              <ReportChartEmptyState reason="no_data" detail="Nessun articolo con copertura bassa." />
            )
          }
        />
        {rischioMatrixRows.length > 0 ? (
          <div className="mt-4">
            <ReportDataTable configId="magazzino-rischio-matrix" rows={rischioMatrixRows} />
          </div>
        ) : null}
      </ReportStorySection>

      <ReportStorySection title={dettaglio.title} subtitle={dettaglio.subtitle} testId="report-story-mag-dettaglio">
        <ReportEmbeddedModule>
          <div className="space-y-4">
            <ReportMagazzinoSection
              derivedBundle={data.derivedBundle}
              prodotti={data.magazzino}
              anchor={data.anchor}
              range={data.range}
              compareDetail={data.compareDetail}
              histRev={data.histRev}
              onHistRev={data.onHistRev}
              embed
            />
            <ReportRicambiConsumoSection
              magLogSorted={data.derivedBundle.magLogSorted}
              prodotti={data.magazzino}
              filterRange={data.range}
              anchor={data.anchor}
              embed
            />
          </div>
        </ReportEmbeddedModule>
      </ReportStorySection>
    </div>
  );
}
