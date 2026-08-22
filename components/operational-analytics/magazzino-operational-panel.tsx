"use client";

import { useMemo, useState } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { ReportMagazzinoSection } from "@/components/report/report-magazzino-section";
import { ReportRicambiConsumoSection } from "@/components/report/report-ricambi-consumo-section";
import { ReportDataTable } from "@/components/report/design-system";
import { MagazzinoCategoryDonutChart } from "@/components/report/primitives/chart/magazzino-category-donut-chart";
import { MagazzinoParetoChart } from "@/components/report/primitives/chart/magazzino-pareto-chart";
import {
  buildMagazzinoCoperturaBassaRows,
  buildMagazzinoStockRiskRows,
  buildParetoConsumi,
  buildRischioCategoriaMatrix,
  buildStockValueByCategory,
} from "@/lib/report/magazzino-analytics";
import { useOperationalLavorazioniData } from "@/lib/report/operational-module/use-operational-lavorazioni-data";
import { LoadingCardSkeleton } from "@/components/design-system";

/** Owner surface: stock analytics — /magazzino */
export function MagazzinoOperationalPanel() {
  const data = useOperationalLavorazioniData();
  const [histRev, setHistRev] = useState(0);

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

  if (data.isLoading) {
    return <LoadingCardSkeleton minHeightClass="min-h-[8rem]" />;
  }

  return (
    <ShellCard
      title="Analisi magazzino"
      subtitle="Stock, consumi e rischio — ultimi 3 mesi"
      collapsible
      defaultCollapsed
      persistScope="magazzino"
      persistKey="operational-analytics"
      data-testid="magazzino-operational-panel"
    >
      <div className="min-w-0 space-y-4">
        <MagazzinoCategoryDonutChart slices={categorySlices} />
        <MagazzinoParetoChart rows={paretoRows} />
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <ReportDataTable configId="sotto-scorta-min" rows={sottoScortaRows} />
          <ReportDataTable configId="copertura-bassa" rows={coperturaRows} />
        </div>
        {rischioMatrixRows.length > 0 ? (
          <ReportDataTable configId="magazzino-rischio-matrix" rows={rischioMatrixRows} />
        ) : null}
        <details className="rounded-lg border border-[color:var(--cab-border)] p-3">
          <summary className="cursor-pointer text-sm font-medium">Matrice mensile e ranking consumi</summary>
          <div className="mt-3 space-y-4">
            <ReportMagazzinoSection
              derivedBundle={data.derivedBundle}
              prodotti={data.magazzino}
              anchor={data.anchor}
              range={data.range}
              compareDetail={null}
              histRev={histRev}
              onHistRev={() => setHistRev((n) => n + 1)}
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
        </details>
      </div>
    </ShellCard>
  );
}
