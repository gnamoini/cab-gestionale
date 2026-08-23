"use client";

import { useMemo } from "react";
import {
  useRegisterAnalyticsSection,
  useReportAnalyticsContext,
} from "@/components/report/analytics/report-analytics-provider";
import { resolveSectionMetricIds } from "@/components/report/analytics/resolve-section-metric-ids";
import { ReportAnalysisSectionShell } from "@/components/report/bi-center/report-analysis-section-shell";
import { ReportAnalyticsKpi } from "@/components/report/design-system/primitives/metric-card/report-analytics-kpi";
import { ReportEconomiaChartsPanel } from "@/components/report/bi-center/report-economia-charts-panel";
import { ReportLavorazioniChartsPanel } from "@/components/report/bi-center/report-lavorazioni-charts-panel";
import { ReportMagazzinoChartsPanel } from "@/components/report/bi-center/report-magazzino-charts-panel";
import { ReportPreventiviChartsPanel } from "@/components/report/bi-center/report-preventivi-charts-panel";
import { ReportTrendChart } from "@/components/report/bi-center/report-trend-chart";
import { LoadingErrorState } from "@/components/design-system";
import type { ReportAnalyticsGranularity } from "@/lib/report/analytics-engine/types";
import { getReportBusinessLabelCardCopy } from "@/lib/report/ui/report-business-labels";

export function SectionMetricGrid({ metricIds }: { metricIds: readonly string[] }) {
  const { envelopesById, result, isLoading, isError, error, refetch } = useReportAnalyticsContext();
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {metricIds.map((id) => (
          <div key={id} className="h-28 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <LoadingErrorState
        title="Metriche non disponibili"
        description={error?.message ?? "Errore di caricamento"}
        onRetry={() => refetch()}
      />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {metricIds.map((id) => {
        const env = envelopesById.get(id);
        if (!env) return null;
        const series = result?.series.find((s) => s.metricId === id);
        return <ReportAnalyticsKpi key={id} envelope={env} series={series} compact />;
      })}
    </div>
  );
}

export function SectionTrend({
  trendMetricId,
  granularity,
}: {
  trendMetricId: string;
  granularity: ReportAnalyticsGranularity;
}) {
  const { result, isLoading } = useReportAnalyticsContext();
  const series = result?.series.find((s) => s.metricId === trendMetricId);
  const label = getReportBusinessLabelCardCopy(trendMetricId, true).title;
  if (isLoading) return null;
  return (
    <div className="mt-4 min-w-0">
      <ReportTrendChart series={series} title={label} />
    </div>
  );
}

function DomainSection({
  registrationKey,
  sectionId,
  title,
  subtitle,
  persistKey,
  trendMetricId,
  granularity = "month",
}: {
  registrationKey: string;
  sectionId: Parameters<typeof resolveSectionMetricIds>[0];
  title: string;
  subtitle: string;
  persistKey: string;
  trendMetricId?: string;
  granularity?: ReportAnalyticsGranularity;
}) {
  const metricIds = useMemo(() => resolveSectionMetricIds(sectionId), [sectionId]);
  const fetchIds = useMemo(() => {
    if (!trendMetricId || metricIds.includes(trendMetricId)) return metricIds;
    return [...metricIds, trendMetricId];
  }, [metricIds, trendMetricId]);

  useRegisterAnalyticsSection(registrationKey, sectionId, {
    metricIds: fetchIds,
    includeSeries: Boolean(trendMetricId),
    granularity: trendMetricId ? granularity : undefined,
  });

  return (
    <ReportAnalysisSectionShell title={title} subtitle={subtitle} persistKey={persistKey}>
      <SectionMetricGrid metricIds={metricIds} />
      {trendMetricId ? <SectionTrend trendMetricId={trendMetricId} granularity={granularity} /> : null}
    </ReportAnalysisSectionShell>
  );
}

export function ReportEconomiaSection() {
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

  return (
    <ReportAnalysisSectionShell
      title="Com'è andata l'economia nel periodo?"
      subtitle="Fatturato, incassi e margini"
      persistKey="bi-economia"
    >
      <SectionMetricGrid metricIds={metricIds} />
      <SectionTrend trendMetricId="eco_fatturato" granularity="month" />
      <ReportEconomiaChartsPanel />
    </ReportAnalysisSectionShell>
  );
}

export function ReportLavorazioniBiSection() {
  const metricIds = useMemo(() => resolveSectionMetricIds("lavorazioni"), []);
  const fetchIds = useMemo(() => {
    const trend = "lav-periodo";
    return metricIds.includes(trend) ? metricIds : [...metricIds, trend];
  }, [metricIds]);

  useRegisterAnalyticsSection("bi-lavorazioni", "lavorazioni", {
    metricIds: fetchIds,
    includeSeries: true,
    granularity: "week",
  });

  return (
    <ReportAnalysisSectionShell
      title="Come stanno andando le lavorazioni?"
      subtitle="Numeri principali e andamento nel periodo"
      persistKey="bi-lavorazioni"
    >
      <SectionMetricGrid metricIds={metricIds} />
      <SectionTrend trendMetricId="lav-periodo" granularity="week" />
      <ReportLavorazioniChartsPanel />
    </ReportAnalysisSectionShell>
  );
}

export function ReportPreventiviSection() {
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

  return (
    <ReportAnalysisSectionShell
      title="Come vanno i preventivi?"
      subtitle="Volume, valore e accettazione nel periodo"
      persistKey="bi-preventivi"
    >
      <SectionMetricGrid metricIds={metricIds} />
      <SectionTrend trendMetricId="eco_preventivi" granularity="month" />
      <ReportPreventiviChartsPanel />
    </ReportAnalysisSectionShell>
  );
}

export function ReportMagazzinoBiSection() {
  const metricIds = useMemo(() => resolveSectionMetricIds("magazzino"), []);
  const fetchIds = useMemo(() => {
    const trend = "ric-usati";
    return metricIds.includes(trend) ? metricIds : [...metricIds, trend];
  }, [metricIds]);

  useRegisterAnalyticsSection("bi-magazzino", "magazzino", {
    metricIds: fetchIds,
    includeSeries: true,
    granularity: "month",
  });

  return (
    <ReportAnalysisSectionShell
      title="Com'è la situazione del magazzino?"
      subtitle="Consumi e valore immobilizzato"
      persistKey="bi-magazzino"
    >
      <SectionMetricGrid metricIds={metricIds} />
      <SectionTrend trendMetricId="ric-usati" granularity="month" />
      <ReportMagazzinoChartsPanel />
    </ReportAnalysisSectionShell>
  );
}

export function ReportRisorseSection() {
  const metricIds = useMemo(() => resolveSectionMetricIds("risorse"), []);
  const fetchIds = useMemo(() => {
    const trend = "presence_hours_total";
    return metricIds.includes(trend) ? metricIds : [...metricIds, trend];
  }, [metricIds]);

  useRegisterAnalyticsSection("bi-risorse", "risorse", {
    metricIds: fetchIds,
    includeSeries: true,
    granularity: "month",
  });

  return (
    <ReportAnalysisSectionShell
      title="Come stanno le risorse dell'officina?"
      subtitle="Capacità, carico e ore nel periodo"
      persistKey="bi-risorse"
    >
      <SectionMetricGrid metricIds={metricIds} />
      <SectionTrend trendMetricId="presence_hours_total" granularity="month" />
    </ReportAnalysisSectionShell>
  );
}
