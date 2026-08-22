"use client";

import { useMemo } from "react";
import {
  useRegisterAnalyticsSection,
  useReportAnalyticsContext,
} from "@/components/report/analytics/report-analytics-provider";
import { resolveSectionMetricIds } from "@/components/report/analytics/resolve-section-metric-ids";
import { ReportAnalysisSectionShell } from "@/components/report/bi-center/report-analysis-section-shell";
import { ReportMetricEnvelopeCard } from "@/components/report/bi-center/report-metric-envelope-card";
import { ReportEconomiaChartsPanel } from "@/components/report/bi-center/report-economia-charts-panel";
import { ReportLavorazioniChartsPanel } from "@/components/report/bi-center/report-lavorazioni-charts-panel";
import { ReportMagazzinoChartsPanel } from "@/components/report/bi-center/report-magazzino-charts-panel";
import { ReportModuleOwnerCta } from "@/components/report/bi-center/report-module-owner-cta";
import { ReportPreventiviChartsPanel } from "@/components/report/bi-center/report-preventivi-charts-panel";
import { ReportTrendChart } from "@/components/report/bi-center/report-trend-chart";
import { LoadingErrorState } from "@/components/design-system";
import type { ReportAnalyticsGranularity } from "@/lib/report/analytics-engine/types";
import { getReportBusinessLabelCardCopy } from "@/lib/report/ui/report-business-labels";

function SectionMetricGrid({ metricIds }: { metricIds: readonly string[] }) {
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
        return <ReportMetricEnvelopeCard key={id} envelope={env} series={series} compact />;
      })}
    </div>
  );
}

function SectionTrend({
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
      <ReportTrendChart series={series} title={`Trend — ${label} (${granularity})`} />
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
  defaultCollapsed = true,
}: {
  registrationKey: string;
  sectionId: Parameters<typeof resolveSectionMetricIds>[0];
  title: string;
  subtitle: string;
  persistKey: string;
  trendMetricId?: string;
  granularity?: ReportAnalyticsGranularity;
  defaultCollapsed?: boolean;
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
    <ReportAnalysisSectionShell title={title} subtitle={subtitle} persistKey={persistKey} defaultCollapsed={defaultCollapsed}>
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
      title="Economia"
      subtitle="Incassi, margine e preventivi — senza duplicare KPI executive"
      persistKey="bi-economia"
      defaultCollapsed
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
      title="Lavorazioni"
      subtitle="Throughput e tempi — ingressi vs chiusure"
      persistKey="bi-lavorazioni"
      defaultCollapsed
    >
      <SectionMetricGrid metricIds={metricIds} />
      <SectionTrend trendMetricId="lav-periodo" granularity="week" />
      <ReportLavorazioniChartsPanel />
      <ReportModuleOwnerCta owner="lavorazioni" />
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
      title="Preventivi & Commerciale"
      subtitle="Volume, valore e accettazione nel periodo"
      persistKey="bi-preventivi"
      defaultCollapsed
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
      title="Magazzino"
      subtitle="Consumi e capitale immobilizzato"
      persistKey="bi-magazzino"
      defaultCollapsed
    >
      <SectionMetricGrid metricIds={metricIds} />
      <SectionTrend trendMetricId="ric-usati" granularity="month" />
      <ReportMagazzinoChartsPanel />
      <ReportModuleOwnerCta owner="magazzino" />
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
      title="Risorse / Officina"
      subtitle="Capacità, carico e ore"
      persistKey="bi-risorse"
      defaultCollapsed
    >
      <SectionMetricGrid metricIds={metricIds} />
      <SectionTrend trendMetricId="presence_hours_total" granularity="month" />
      <ReportModuleOwnerCta owner="dipendenti" />
    </ReportAnalysisSectionShell>
  );
}
