"use client";

import { useMemo } from "react";
import {
  useRegisterAnalyticsSection,
  useReportAnalyticsContext,
} from "@/components/report/analytics/report-analytics-provider";
import { resolveSectionMetricIds } from "@/components/report/analytics/resolve-section-metric-ids";
import { SectionMetricGrid, SectionTrend } from "@/components/report/bi-center/report-domain-sections";
import {
  ReportEconomiaArAgingChart,
  ReportEconomiaClienteHeatmap,
  ReportEconomiaRevenueTrendChart,
} from "@/components/report/bi-center/report-economia-charts-panel";
import {
  ReportAnalyticsKpi,
  ReportChartEmptyState,
  ReportLayoutMainAside,
  ReportLayoutSplit,
  ReportStorySection,
} from "@/components/report/design-system";
import { resolveChartLayout } from "@/lib/report/ui/report-layout-rules";
import { getReportStoryCopy } from "@/lib/report/ui/report-copy";

function EconomiaAndamentoAside() {
  const { envelopesById } = useReportAnalyticsContext();
  const incassato = envelopesById.get("eco_incassato");
  const margine = envelopesById.get("eco_margine_operativo_stimato");

  return (
    <div className="space-y-3">
      {incassato ? <ReportAnalyticsKpi envelope={incassato} compact /> : null}
      {margine ? <ReportAnalyticsKpi envelope={margine} compact /> : null}
    </div>
  );
}

function EconomiaIncassiAside() {
  const { envelopesById } = useReportAnalyticsContext();
  const daIncassare = envelopesById.get("eco_da_incassare");
  const scaduto = envelopesById.get("eco_importo_scaduto");

  return (
    <div className="space-y-3">
      {daIncassare ? <ReportAnalyticsKpi envelope={daIncassare} compact /> : null}
      {scaduto ? <ReportAnalyticsKpi envelope={scaduto} compact /> : null}
    </div>
  );
}

export function ReportAreaEconomiaView() {
  const metricIds = useMemo(() => resolveSectionMetricIds("economia"), []);
  const fetchIds = useMemo(() => {
    const trend = "eco_fatturato";
    return metricIds.includes(trend) ? metricIds : [...metricIds, trend];
  }, [metricIds]);

  useRegisterAnalyticsSection("bi-economia", "economia", {
    metricIds: fetchIds,
    includeSeries: true,
    granularity: "month",
  });

  const { result } = useReportAnalyticsContext();
  const series = result?.series.find((s) => s.metricId === "eco_fatturato");
  const pointCount = series?.points?.length ?? 0;
  const trendLayout = resolveChartLayout({ chartType: "line", pointCount });
  const incassiLayout = resolveChartLayout({ chartType: "bar", categoryCount: 5 });

  const situazione = getReportStoryCopy("eco-situazione");
  const andamento = getReportStoryCopy("eco-andamento");
  const incassi = getReportStoryCopy("eco-incassi");
  const distribuzione = getReportStoryCopy("eco-distribuzione");
  const dettaglio = getReportStoryCopy("eco-dettaglio");

  return (
    <div className="min-w-0" data-testid="report-area-economia">
      <ReportStorySection
        title={situazione.title}
        subtitle={situazione.subtitle}
        testId="report-story-eco-situazione"
        showDivider={false}
      >
        <SectionMetricGrid metricIds={metricIds} />
      </ReportStorySection>

      <ReportStorySection title={andamento.title} subtitle={andamento.subtitle} testId="report-story-eco-andamento">
        {pointCount === 0 ? (
          <ReportChartEmptyState reason="insufficient_points" />
        ) : (
          <ReportLayoutMainAside
            decision={trendLayout}
            main={<SectionTrend trendMetricId="eco_fatturato" granularity="month" />}
            aside={<EconomiaAndamentoAside />}
          />
        )}
      </ReportStorySection>

      <ReportStorySection title={incassi.title} subtitle={incassi.subtitle} testId="report-story-eco-incassi">
        <ReportLayoutMainAside
          decision={incassiLayout}
          main={<ReportEconomiaArAgingChart />}
          aside={<EconomiaIncassiAside />}
        />
      </ReportStorySection>

      <ReportStorySection
        title={distribuzione.title}
        subtitle={distribuzione.subtitle}
        testId="report-story-eco-distribuzione"
      >
        <ReportLayoutSplit left={<ReportEconomiaRevenueTrendChart />} right={<ReportEconomiaArAgingChart />} />
      </ReportStorySection>

      <ReportStorySection title={dettaglio.title} subtitle={dettaglio.subtitle} testId="report-story-eco-dettaglio">
        <ReportEconomiaClienteHeatmap />
      </ReportStorySection>
    </div>
  );
}
