"use client";

import { useMemo } from "react";
import {
  useRegisterAnalyticsSection,
  useReportAnalyticsContext,
} from "@/components/report/analytics/report-analytics-provider";
import { resolveSectionMetricIds } from "@/components/report/analytics/resolve-section-metric-ids";
import { SectionMetricGrid, SectionTrend } from "@/components/report/bi-center/report-domain-sections";
import { ReportPreventiviAccettazioneChart } from "@/components/report/bi-center/report-preventivi-content";
import {
  ReportAnalyticsKpi,
  ReportChartEmptyState,
  ReportLayoutMainAside,
  ReportStorySection,
} from "@/components/report/design-system";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { buildPreventiviFunnel } from "@/lib/report/economic-analytics-extended";
import { resolveChartLayout } from "@/lib/report/ui/report-layout-rules";
import { getReportStoryCopy } from "@/lib/report/ui/report-copy";
import { usePreventiviRecordsQuery } from "@/src/hooks/gestionale/use-preventivi-records-query";
import { useRbac } from "@/src/hooks/use-rbac";

function PreventiviAndamentoAside() {
  const { envelopesById } = useReportAnalyticsContext();
  const winRate = envelopesById.get("win_rate_preventivi");
  const approvati = envelopesById.get("eco_preventivi_approvati");

  return (
    <div className="space-y-3">
      {winRate ? <ReportAnalyticsKpi envelope={winRate} compact /> : null}
      {approvati ? <ReportAnalyticsKpi envelope={approvati} compact /> : null}
    </div>
  );
}

function PreventiviDettaglioTable() {
  const { range } = useReportPeriodContext();
  const { canReadPage } = useRbac();
  const canPreventivi = canReadPage("preventivi");
  const preventiviQ = usePreventiviRecordsQuery(canPreventivi);
  const preventivi = useMemo(
    () => (preventiviQ.isError ? [] : preventiviQ.records),
    [preventiviQ.isError, preventiviQ.records],
  );

  const rows = useMemo(() => {
    return buildPreventiviFunnel(preventivi, range).map((r) => ({
      esito: r.label,
      quantita: r.count,
      valore: r.value.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }),
    }));
  }, [preventivi, range]);

  if (!canPreventivi || rows.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-[color:var(--cab-border)]">
      <table className="w-full min-w-[280px] text-sm">
        <thead>
          <tr className="border-b border-[color:var(--cab-border)] bg-[color:var(--cab-surface-muted)]">
            <th className="px-3 py-2 text-left font-medium">Esito</th>
            <th className="px-3 py-2 text-right font-medium">Quantità</th>
            <th className="px-3 py-2 text-right font-medium">Valore</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.esito} className="border-b border-[color:var(--cab-border)] last:border-b-0">
              <td className="px-3 py-2">{row.esito}</td>
              <td className="px-3 py-2 text-right tabular-nums">{row.quantita}</td>
              <td className="px-3 py-2 text-right tabular-nums">{row.valore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportAreaPreventiviView() {
  const metricIds = useMemo(() => resolveSectionMetricIds("preventivi"), []);
  const fetchIds = useMemo(() => {
    const trend = "eco_preventivi";
    return metricIds.includes(trend) ? metricIds : [...metricIds, trend];
  }, [metricIds]);

  useRegisterAnalyticsSection("bi-preventivi", "preventivi", {
    metricIds: fetchIds,
    includeSeries: true,
    granularity: "month",
  });

  const { result } = useReportAnalyticsContext();
  const series = result?.series.find((s) => s.metricId === "eco_preventivi");
  const pointCount = series?.points?.length ?? 0;
  const trendLayout = resolveChartLayout({ chartType: "line", pointCount });

  const situazione = getReportStoryCopy("prev-situazione");
  const andamento = getReportStoryCopy("prev-andamento");
  const distribuzione = getReportStoryCopy("prev-distribuzione");
  const dettaglio = getReportStoryCopy("prev-dettaglio");

  return (
    <div className="min-w-0" data-testid="report-area-preventivi">
      <ReportStorySection
        title={situazione.title}
        subtitle={situazione.subtitle}
        testId="report-story-prev-situazione"
        showDivider={false}
      >
        <SectionMetricGrid metricIds={metricIds} />
      </ReportStorySection>

      <ReportStorySection title={andamento.title} subtitle={andamento.subtitle} testId="report-story-prev-andamento">
        {pointCount === 0 ? (
          <ReportChartEmptyState reason="insufficient_points" />
        ) : (
          <ReportLayoutMainAside
            decision={trendLayout}
            main={<SectionTrend trendMetricId="eco_preventivi" granularity="month" />}
            aside={<PreventiviAndamentoAside />}
          />
        )}
      </ReportStorySection>

      <ReportStorySection
        title={distribuzione.title}
        subtitle={distribuzione.subtitle}
        testId="report-story-prev-distribuzione"
      >
        <ReportPreventiviAccettazioneChart />
      </ReportStorySection>

      <ReportStorySection title={dettaglio.title} subtitle={dettaglio.subtitle} testId="report-story-prev-dettaglio">
        <PreventiviDettaglioTable />
      </ReportStorySection>
    </div>
  );
}
