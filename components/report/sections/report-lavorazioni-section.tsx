"use client";

import { useMemo } from "react";
import { ReportLavorazioniSection } from "@/components/report/report-lavorazioni-section";
import { useReportAnalyticsDerived } from "@/components/report/report-analytics-derived-context";
import { useReportAnalyticsDerivedActions } from "@/components/report/report-analytics-derived-context";
import {
  ReportExecutiveAlertSections,
  ReportExecutiveSummaryContent,
} from "@/components/report/layout/report-executive-overview";
import { ReportExecutiveKpiSection } from "@/components/report/layout/report-executive-kpi-section";
import { useReportPerformanceContext } from "@/components/report/layout/report-performance-context";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import {
  ReportBarChart,
  ReportDataTable,
  ReportDomainMetricsGrid,
  ReportMatrix,
  ReportSection,
} from "@/components/report/design-system";
import { usePublishWhenReady } from "@/components/report/sections/use-section-publish";
import { reportComparePublishInput } from "@/lib/report/report-compare-publish";

const MONTHS_SHORT = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"] as const;

export default function ReportLavorazioniSectionView(props: DomainReportSectionProps) {
  const derived = useReportAnalyticsDerived();
  const { partitioned } = useReportPerformanceContext();
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
        ...reportComparePublishInput(props),
        attive: props.attive,
        storico: props.storico,
        completate: props.completate,
        lavRows: props.lavListRows,
        manualByMonth: props.manualByMonth,
      });
    },
  );

  const metrics = derived.operational?.data.metrics ?? [];

  const chartPoints = useMemo(() => {
    const year = props.anchor.getFullYear();
    const model = props.semanticIndex.buildTemporalModel(year, props.range);
    return model.months.map((m, i) => ({
      label: MONTHS_SHORT[i]!,
      value: m.count,
      muted: !m.inEffectiveRange,
    }));
  }, [props.anchor, props.range, props.semanticIndex]);

  const monthlyRows = useMemo(
    () =>
      chartPoints
        .filter((p) => !p.muted)
        .map((p) => ({ mese: p.label, count: p.value })),
    [chartPoints],
  );

  return (
    <div className="min-w-0 space-y-4">
      <ReportSection
        id="report-lav-summary"
        title="Sintesi operativa"
        subtitle="Stato officina e flotta nel periodo selezionato"
      >
        <ReportExecutiveSummaryContent compareMode={props.analyticsContext.compareMode} />
      </ReportSection>

      <ReportExecutiveAlertSections />

      {partitioned.lavorazioni.length > 0 ? (
        <ReportSection
          id="report-lav-unified-kpi"
          title="Indicatori chiave"
          subtitle="KPI lavorazioni con confronto periodo"
        >
          <ReportExecutiveKpiSection
            items={partitioned.lavorazioni}
            compareMode={props.analyticsContext.compareMode}
          />
        </ReportSection>
      ) : null}

      <ReportSection id="report-lav-kpi" title="Indicatori operativi" subtitle="KPI lavorazioni nel periodo">
        <ReportDomainMetricsGrid metrics={metrics} compareMode={props.analyticsContext.compareMode} />
      </ReportSection>

      <ReportSection
        id="report-lav-temporal"
        title="Ritmo mensile"
        subtitle="Trend e andamento temporale"
        defaultCollapsed
      >
        <ReportBarChart points={chartPoints} title="Lavorazioni per mese" />
        <div className="mt-4">
          <ReportDataTable configId="lavorazioni-mensile" rows={monthlyRows} />
        </div>
      </ReportSection>

      <ReportSection
        id="report-lav-matrix"
        title="Matrice lavorazioni"
        subtitle="Matrice annuale e previsione"
        defaultCollapsed
      >
        <ReportMatrix title="Heatmap annuale">
          <ReportLavorazioniSection
            attive={props.attive}
            completate={props.completate}
            anchor={props.anchor}
            filterRange={props.range}
            compareDetail={props.compareDetail}
            semanticIndex={props.semanticIndex}
            embed
          />
        </ReportMatrix>
      </ReportSection>
    </div>
  );
}
