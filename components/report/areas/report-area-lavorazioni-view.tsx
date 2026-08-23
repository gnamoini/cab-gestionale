"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { ReportAgingBacklogStackedChart } from "@/components/report/primitives/chart/aging-backlog-stacked-chart";
import { ReportCloseTimePrioritaChart } from "@/components/report/primitives/chart/close-time-priorita-chart";
import { ReportLavorazioniFunnelChart } from "@/components/report/primitives/chart/lavorazioni-funnel-chart";
import { ReportLavorazioniSection } from "@/components/report/report-lavorazioni-section";
import {
  ReportChartEmptyState,
  ReportDataTable,
  ReportEmbeddedModule,
  ReportLayoutMainAside,
  ReportLayoutSplit,
  ReportStorySection,
} from "@/components/report/design-system";
import { useReportDomainSnapshot } from "@/components/report/context/report-domain-snapshot-context";
import {
  buildAgingBacklogStackedByStato,
  buildCloseTimeByPriorita,
  buildStatoAgingMatrix,
  buildWipFunnelByStato,
  listInterventiOltreSla,
} from "@/lib/report/lavorazioni-work-orders";
import { getReportStoryCopy } from "@/lib/report/ui/report-copy";
import { resolveChartLayout } from "@/lib/report/ui/report-layout-rules";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";

const ReportLavorazioniBiSection = dynamic(() =>
  import("@/components/report/bi-center/report-domain-sections").then((m) => m.ReportLavorazioniBiSection),
);

export function ReportAreaLavorazioniView() {
  const data = useReportDomainSnapshot();
  const settingsQ = useCabAppSettingsPayloadQuery({ tier: "static" });

  const statoLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of settingsQ.data?.resolved?.lavorazioni.stati ?? []) map.set(s.id, s.label);
    return map;
  }, [settingsQ.data]);

  const statoColorById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of settingsQ.data?.resolved?.lavorazioni.stati ?? []) {
      if (s.color) map.set(s.id, s.color);
    }
    return map;
  }, [settingsQ.data]);

  const agingStacked = useMemo(
    () => buildAgingBacklogStackedByStato(data.attive, statoLabelById, statoColorById, data.anchor),
    [data.attive, statoLabelById, statoColorById, data.anchor],
  );

  const statoAgingRows = useMemo(
    () =>
      buildStatoAgingMatrix(data.attive, statoLabelById, data.anchor).map((r) => ({
        stato: r.stato,
        b0_7: r.buckets["0-7"],
        b8_14: r.buckets["8-14"],
        b15_30: r.buckets["15-30"],
        b30p: r.buckets["30+"],
        totale: r.totale,
      })),
    [data.attive, statoLabelById, data.anchor],
  );

  const funnelRows = useMemo(
    () => buildWipFunnelByStato(data.attive, statoLabelById),
    [data.attive, statoLabelById],
  );

  const closeByPriorita = useMemo(
    () => buildCloseTimeByPriorita(data.completate, data.range),
    [data.completate, data.range],
  );

  const slaRows = useMemo(
    () => listInterventiOltreSla(data.attive, statoLabelById, data.anchor),
    [data.attive, statoLabelById, data.anchor],
  );

  const concentrazioneLayout = resolveChartLayout({
    chartType: "stackedBar",
    categoryCount: agingStacked.length,
    seriesCount: statoAgingRows.length > 0 ? 4 : 1,
  });

  const situazione = getReportStoryCopy("lav-situazione");
  const concentrazione = getReportStoryCopy("lav-concentrazione");
  const attenzione = getReportStoryCopy("lav-attenzione");
  const dettaglio = getReportStoryCopy("lav-dettaglio");
  const strumenti = getReportStoryCopy("lav-strumenti");

  return (
    <div className="min-w-0" data-testid="report-area-lavorazioni">
      <ReportStorySection
        title={situazione.title}
        subtitle={situazione.subtitle}
        testId="report-story-lav-situazione"
        showDivider={false}
      >
        <ReportLavorazioniBiSection />
      </ReportStorySection>

      <ReportStorySection
        title={concentrazione.title}
        subtitle={concentrazione.subtitle}
        testId="report-story-lav-concentrazione"
      >
        <ReportLayoutMainAside
          decision={concentrazioneLayout}
          main={
            agingStacked.length > 0 ? (
              <ReportAgingBacklogStackedChart series={agingStacked} />
            ) : (
              <ReportChartEmptyState reason="no_data" />
            )
          }
          aside={
            statoAgingRows.length > 0 ? (
              <ReportDataTable configId="lav-stato-aging" rows={statoAgingRows} />
            ) : (
              <ReportChartEmptyState reason="insufficient_points" detail="Nessun lavoro aperto da classificare." />
            )
          }
        />
      </ReportStorySection>

      <ReportStorySection title={attenzione.title} subtitle={attenzione.subtitle} testId="report-story-lav-attenzione">
        {slaRows.length > 0 ? (
          <ReportDataTable configId="lav-sla" rows={slaRows} />
        ) : (
          <ReportChartEmptyState reason="no_data" detail="Nessun lavoro oltre il termine previsto." />
        )}
      </ReportStorySection>

      <ReportStorySection title={dettaglio.title} subtitle={dettaglio.subtitle} testId="report-story-lav-dettaglio">
        <ReportLayoutSplit
          left={
            funnelRows.length > 0 ? (
              <ReportLavorazioniFunnelChart rows={funnelRows} />
            ) : (
              <ReportChartEmptyState reason="no_data" />
            )
          }
          right={
            closeByPriorita.length > 0 ? (
              <ReportCloseTimePrioritaChart rows={closeByPriorita} />
            ) : (
              <ReportChartEmptyState reason="insufficient_points" />
            )
          }
        />
      </ReportStorySection>

      <ReportStorySection title={strumenti.title} subtitle={strumenti.subtitle} testId="report-story-lav-strumenti">
        <ReportEmbeddedModule>
          <ReportLavorazioniSection
            attive={data.attive}
            completate={data.completate}
            anchor={data.anchor}
            filterRange={data.range}
            compareDetail={data.compareDetail}
            semanticIndex={data.semanticIndex}
            embed
            showManualImport
          />
        </ReportEmbeddedModule>
      </ReportStorySection>
    </div>
  );
}
