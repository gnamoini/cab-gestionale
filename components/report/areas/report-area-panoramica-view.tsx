"use client";

import { GestionaleClientErrorBoundary } from "@/components/observability/gestionale-client-error-boundary";
import { ReportExecutiveOverviewContent } from "@/components/report/bi-center/report-executive-overview";
import { ReportHistoricalTrendContent } from "@/components/report/bi-center/report-historical-trend-section";
import { ReportPrimaryTrendContent } from "@/components/report/bi-center/report-primary-trend-section";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import {
  ReportLayoutMainAside,
  ReportStorySection,
} from "@/components/report/design-system";
import { ReportV2InsightContent } from "@/components/report/insight-strip/ReportV2InsightBoundary";
import { resolveReportV2InsightsEnabled } from "@/lib/feature-flags/report-v2-flag";
import { getReportStoryCopy } from "@/lib/report/ui/report-copy";
import { resolveChartLayout } from "@/lib/report/ui/report-layout-rules";

export function ReportAreaPanoramicaView() {
  const { range, compareMode } = useReportPeriodContext();
  const insightsEnabled = resolveReportV2InsightsEnabled() && range != null;

  const trendLayout = resolveChartLayout({ chartType: "line", pointCount: 8 });

  const situazione = getReportStoryCopy("pan-situazione");
  const andamento = getReportStoryCopy("pan-andamento");
  const cambiamenti = getReportStoryCopy("pan-cambiamenti");
  const storico = getReportStoryCopy("pan-storico");

  return (
    <div className="min-w-0" data-testid="report-area-panoramica">
      <ReportStorySection
        title={situazione.title}
        subtitle={situazione.subtitle}
        testId="report-story-pan-situazione"
        showDivider={false}
      >
        <ReportExecutiveOverviewContent />
      </ReportStorySection>

      <ReportStorySection title={andamento.title} subtitle={andamento.subtitle} testId="report-story-pan-andamento">
        <ReportLayoutMainAside decision={trendLayout} main={<ReportPrimaryTrendContent />} />
      </ReportStorySection>

      {insightsEnabled ? (
        <ReportStorySection
          title={cambiamenti.title}
          subtitle={cambiamenti.subtitle}
          testId="report-story-pan-cambiamenti"
        >
          <GestionaleClientErrorBoundary>
            <ReportV2InsightContent range={range} compareMode={compareMode} />
          </GestionaleClientErrorBoundary>
        </ReportStorySection>
      ) : null}

      <ReportStorySection title={storico.title} subtitle={storico.subtitle} testId="report-story-pan-storico">
        <ReportHistoricalTrendContent />
      </ReportStorySection>
    </div>
  );
}
