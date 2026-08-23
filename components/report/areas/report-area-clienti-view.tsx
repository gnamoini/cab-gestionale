"use client";

import { useMemo } from "react";
import {
  useRegisterAnalyticsSection,
  useReportAnalyticsContext,
} from "@/components/report/analytics/report-analytics-provider";
import { resolveSectionMetricIds } from "@/components/report/analytics/resolve-section-metric-ids";
import {
  ReportAnalyticsKpi,
  ReportChartEmptyState,
  ReportLayoutKpiStrip,
  ReportLayoutMainAside,
  ReportStorySection,
} from "@/components/report/design-system";
import { LoadingErrorState } from "@/components/design-system";
import {
  ReportClientiDetailList,
  ReportClientiFatturatoCompareAside,
  ReportClientiKpiStrip,
  ReportClientiParetoChart,
} from "@/components/report/bi-center/report-clienti-section";
import { getReportStoryCopy } from "@/lib/report/ui/report-copy";
import { resolveChartLayout } from "@/lib/report/ui/report-layout-rules";

function ClientiKpiSection() {
  const { isLoading, isError, error, refetch } = useReportAnalyticsContext();
  if (isLoading) {
    return (
      <ReportLayoutKpiStrip>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />
        ))}
      </ReportLayoutKpiStrip>
    );
  }
  if (isError) {
    return (
      <LoadingErrorState
        title="Clienti non disponibili"
        description={error?.message ?? "Errore di caricamento"}
        onRetry={() => refetch()}
      />
    );
  }
  return (
    <ReportLayoutKpiStrip>
      <ReportClientiKpiStrip />
    </ReportLayoutKpiStrip>
  );
}

export function ReportAreaClientiView() {
  const metricIds = useMemo(() => resolveSectionMetricIds("clienti"), []);
  useRegisterAnalyticsSection("bi-clienti", "clienti", { dimensions: ["cliente"], metricIds });

  const { result, envelopesById } = useReportAnalyticsContext();
  const breakdown = result?.dimensions.find(
    (d) => d.dimension === "cliente" && d.metricId === "eco_fatturato",
  );
  const categoryCount = breakdown?.rows?.length ?? 0;
  const totalEnvelope = envelopesById.get("eco_fatturato");

  const paretoLayout = resolveChartLayout({
    chartType: "horizontalBar",
    categoryCount: Math.min(categoryCount, 10),
  });

  const situazione = getReportStoryCopy("cli-situazione");
  const distribuzione = getReportStoryCopy("cli-distribuzione");
  const andamento = getReportStoryCopy("cli-andamento");
  const dettaglio = getReportStoryCopy("cli-dettaglio");

  return (
    <div className="min-w-0" data-testid="report-area-clienti">
      <ReportStorySection
        title={situazione.title}
        subtitle={situazione.subtitle}
        testId="report-story-cli-situazione"
        showDivider={false}
      >
        <ClientiKpiSection />
      </ReportStorySection>

      <ReportStorySection
        title={distribuzione.title}
        subtitle={distribuzione.subtitle}
        testId="report-story-cli-distribuzione"
      >
        {categoryCount === 0 ? (
          <ReportChartEmptyState reason="no_data" detail="Nessun cliente con fatturato nel periodo." />
        ) : (
          <ReportLayoutMainAside
            decision={paretoLayout}
            main={<ReportClientiParetoChart />}
            aside={
              totalEnvelope ? (
                <ReportAnalyticsKpi envelope={totalEnvelope} compact />
              ) : (
                <ReportChartEmptyState reason="no_data" />
              )
            }
          />
        )}
      </ReportStorySection>

      <ReportStorySection title={andamento.title} subtitle={andamento.subtitle} testId="report-story-cli-andamento">
        <ReportClientiFatturatoCompareAside />
      </ReportStorySection>

      <ReportStorySection title={dettaglio.title} subtitle={dettaglio.subtitle} testId="report-story-cli-dettaglio">
        <ReportClientiDetailList />
      </ReportStorySection>
    </div>
  );
}
