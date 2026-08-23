"use client";

import { useMemo } from "react";
import { useRegisterAnalyticsSection } from "@/components/report/analytics/report-analytics-provider";
import { resolveSectionMetricIds } from "@/components/report/analytics/resolve-section-metric-ids";
import { ReportCrossCatenaChart } from "@/components/report/bi-center/advanced/report-cross-catena-section";
import { ReportCrossComparativeTrendChart } from "@/components/report/bi-center/advanced/report-cross-trend-section";
import {
  ReportCrossDomainComparisons,
  ReportCrossMetricsKpiStrip,
} from "@/components/report/bi-center/advanced/report-cross-metrics-section";
import { ReportAnalyticsKpi, ReportLayoutDetail, ReportStorySection } from "@/components/report/design-system";
import { useReportAnalyticsContext } from "@/components/report/analytics/report-analytics-provider";
import { getReportStoryCopy } from "@/lib/report/ui/report-copy";

function CrossDettaglioKpiRecap() {
  const metricIds = useMemo(() => resolveSectionMetricIds("cross"), []);
  const { envelopesById } = useReportAnalyticsContext();

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
      {metricIds.map((id) => {
        const env = envelopesById.get(id);
        if (!env) return null;
        return <ReportAnalyticsKpi key={id} envelope={env} series={undefined} />;
      })}
    </div>
  );
}

export function ReportAreaTrasversaliView() {
  const crossMetricIds = useMemo(() => resolveSectionMetricIds("cross"), []);
  useRegisterAnalyticsSection("bi-cross-metrics", "cross", {
    metricIds: crossMetricIds,
    includeSeries: false,
  });

  const situazione = getReportStoryCopy("cross-situazione");
  const confronto = getReportStoryCopy("cross-confronto");
  const catena = getReportStoryCopy("cross-catena");
  const andamento = getReportStoryCopy("cross-andamento");
  const dettaglio = getReportStoryCopy("cross-dettaglio");

  return (
    <div className="min-w-0" data-testid="report-area-trasversali">
      <ReportStorySection
        title={situazione.title}
        subtitle={situazione.subtitle}
        testId="report-story-cross-situazione"
        showDivider={false}
      >
        <ReportCrossMetricsKpiStrip />
      </ReportStorySection>

      <ReportStorySection title={confronto.title} subtitle={confronto.subtitle} testId="report-story-cross-confronto">
        <ReportCrossDomainComparisons />
      </ReportStorySection>

      <ReportStorySection title={catena.title} subtitle={catena.subtitle} testId="report-story-cross-catena">
        <ReportCrossCatenaChart />
      </ReportStorySection>

      <ReportStorySection title={andamento.title} subtitle={andamento.subtitle} testId="report-story-cross-andamento">
        <ReportCrossComparativeTrendChart />
      </ReportStorySection>

      <ReportStorySection title={dettaglio.title} subtitle={dettaglio.subtitle} testId="report-story-cross-dettaglio">
        <ReportLayoutDetail>
          <CrossDettaglioKpiRecap />
        </ReportLayoutDetail>
      </ReportStorySection>
    </div>
  );
}
