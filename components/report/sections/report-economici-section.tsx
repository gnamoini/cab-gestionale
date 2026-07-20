"use client";

import { useMemo, useState } from "react";
import { KpiPerformanceEconomic } from "@/components/report/kpi-performance/kpi-performance-economic";
import { ReportArAgingChart } from "@/components/report/primitives/chart/ar-aging-chart";
import { ReportClienteAgingHeatmap } from "@/components/report/primitives/chart/cliente-aging-heatmap";
import { ReportMarginWaterfallChart } from "@/components/report/primitives/chart/margin-waterfall-chart";
import { ReportPreventiviFunnelChart } from "@/components/report/primitives/chart/preventivi-funnel-chart";
import { ReportRevenueCollectionChart } from "@/components/report/primitives/chart/revenue-collection-chart";
import { ReportRevenueMixDonut } from "@/components/report/primitives/chart/revenue-mix-donut";
import {
  useReportAnalyticsDerived,
  useReportAnalyticsDerivedActions,
} from "@/components/report/report-analytics-derived-context";
import { useReportPerformanceContext } from "@/components/report/layout/report-performance-context";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import { ReportDataTable, ReportSection } from "@/components/report/design-system";
import { ReportEconomicMetricsLayout } from "@/components/report/sections/report-economic-metrics-layout";
import { ReportEconomicTabs, type EconomicTabId } from "@/components/report/sections/report-economic-tabs";
import { usePublishWhenReady } from "@/components/report/sections/use-section-publish";
import {
  buildClienteAgingHeatmap,
  buildIncassoForecast,
  buildMarginWaterfall,
  buildPreventiviFunnel,
  buildPreventivoVsConsuntivo,
  buildResiduoDaFatturare,
  buildRevenueCollectionMonthlySeries,
  buildRevenueMixByType,
  buildScadutiByCliente,
  buildTopClientiFatturatoEnriched,
} from "@/lib/report/economic-analytics-extended";
import {
  buildInvoiceArAgingPoints,
  computeDsoDays,
  computePreventiviWinRate,
} from "@/lib/report/economic-credit-analytics";
import { countCompletedInRange } from "@/lib/report/lavorazioni-report-selectors";
import type { DdtListPayload } from "@/lib/ddt/types";
import { ddtEntry } from "@/lib/domain/ddt-entry";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { useInvoicesQuery } from "@/src/hooks/gestionale/use-invoices-query";
import { usePreventiviRecordsQuery } from "@/src/hooks/gestionale/use-preventivi-records-query";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { QK } from "@/src/lib/react-query/query-keys";
import type { ServiceResult } from "@/src/services/service-result";
import type { ReportDomainMetric } from "@/lib/report/report-domain-types";
import { isoInRange } from "@/lib/report/date-ranges";

function creditMetric(id: string, label: string, value: string): ReportDomainMetric {
  return { id, label, state: { status: "available", value } };
}

function useReportDdtDocumentsQuery(enabled: boolean, rangeKey: string) {
  const gestOpts = useGestionaleQueryOpts();
  const queryKey = [...QK.ddt, "report", rangeKey] as const;
  return useServiceQuery<DdtListPayload, typeof queryKey>(
    queryKey,
    () => ddtEntry.getList() as Promise<ServiceResult<DdtListPayload>>,
    { enabled, ...gestOpts },
  );
}

export default function ReportEconomiciSectionView(props: DomainReportSectionProps) {
  const derived = useReportAnalyticsDerived();
  const { perf } = useReportPerformanceContext();
  const { publishEconomicAnalytics } = useReportAnalyticsDerivedActions();
  const preventiviQ = usePreventiviRecordsQuery(props.fetchEnabled);
  const invoicesQ = useInvoicesQuery(props.fetchEnabled);
  const ddtQ = useReportDdtDocumentsQuery(props.fetchEnabled, props.rangeKey);
  const [activeTab, setActiveTab] = useState<EconomicTabId>("fatture");

  const loading = preventiviQ.isLoading || invoicesQ.isLoading || ddtQ.isLoading;
  const isError = preventiviQ.isError || invoicesQ.isError || ddtQ.isError;

  const refetchAll = () => {
    void preventiviQ.refetch();
    void invoicesQ.refetch();
    void ddtQ.refetch();
  };

  const derivedHints = useMemo(() => {
    const op = derived.operational?.data;
    const lab = derived.labor?.data;
    const wh = derived.warehouse?.data;
    const completedPrev =
      props.showCompare && props.compareRange
        ? countCompletedInRange(props.completate, props.compareRange, props.manualByMonth)
        : null;
    const billingResiduo =
      invoicesQ.preventiviBilling.length > 0
        ? buildResiduoDaFatturare(invoicesQ.preventiviBilling)
        : null;
    return {
      completedInPeriod: op?.completedInPeriod ?? null,
      completedInPeriodPrev: completedPrev,
      manodoperaCost: lab?.manodoperaCost ?? null,
      movementValue: wh?.movementValue ?? null,
      billingResiduo,
    };
  }, [
    derived.operational,
    derived.labor,
    derived.warehouse,
    props.showCompare,
    props.compareRange,
    props.completate,
    props.manualByMonth,
    invoicesQ.preventiviBilling,
  ]);

  usePublishWhenReady(
    props.fetchEnabled && !loading,
    [
      props.rangeKey,
      preventiviQ.records,
      invoicesQ.invoices,
      invoicesQ.payments,
      invoicesQ.preventiviBilling,
      ddtQ.data?.documents,
      isError,
      derivedHints.completedInPeriod,
      derivedHints.manodoperaCost,
      derivedHints.movementValue,
      derivedHints.billingResiduo,
    ],
    (requestId) => {
      if (isError) return;
      publishEconomicAnalytics({
        rangeKey: props.rangeKey,
        requestId,
        range: props.range,
        compareRange: props.showCompare ? props.compareRange : null,
        compareMode: props.analyticsContext.compareMode,
        preventivi: preventiviQ.records,
        invoices: invoicesQ.invoices,
        invoicePayments: invoicesQ.payments,
        preventiviBilling: invoicesQ.preventiviBilling,
        ddtDocuments: ddtQ.data?.documents ?? [],
        derivedHints,
      });
    },
  );

  const extraMetrics = useMemo((): ReportDomainMetric[] => {
    const out: ReportDomainMetric[] = [];
    const dso = computeDsoDays(invoicesQ.invoices, props.range);
    if (dso != null) out.push(creditMetric("dso", "DSO stimato", `${dso} gg`));
    const winRate = computePreventiviWinRate(preventiviQ.records, props.range);
    if (winRate != null) out.push(creditMetric("win_rate_preventivi", "Win rate preventivi", `${winRate}%`));
    return out;
  }, [invoicesQ.invoices, preventiviQ.records, props.range]);

  const metrics = useMemo(() => {
    if (!derived.economic) return extraMetrics;
    const base = (() => {
      if (isError) {
        return derived.economic.data.metrics.map((m) => ({
          ...m,
          state: {
            status: "error" as const,
            message: "Impossibile caricare i dati economici",
            retry: refetchAll,
          },
        }));
      }
      if (loading) {
        return derived.economic.data.metrics.map((m) => ({
          ...m,
          state: { status: "loading" as const },
        }));
      }
      return derived.economic.data.metrics;
    })();
    return [...base, ...extraMetrics];
  }, [derived.economic, extraMetrics, isError, loading, refetchAll]);

  const revenueSeries = useMemo(
    () => buildRevenueCollectionMonthlySeries(invoicesQ.invoices, invoicesQ.payments, props.range),
    [invoicesQ.invoices, invoicesQ.payments, props.range],
  );

  const revenueCompareSeries = useMemo(
    () =>
      props.showCompare && props.compareRange
        ? buildRevenueCollectionMonthlySeries(invoicesQ.invoices, invoicesQ.payments, props.compareRange)
        : null,
    [invoicesQ.invoices, invoicesQ.payments, props.showCompare, props.compareRange],
  );

  const arAgingPoints = useMemo(
    () => buildInvoiceArAgingPoints(invoicesQ.invoices, props.anchor),
    [invoicesQ.invoices, props.anchor],
  );

  const funnelRows = useMemo(
    () => buildPreventiviFunnel(preventiviQ.records, props.range),
    [preventiviQ.records, props.range],
  );

  const mixSlices = useMemo(
    () => buildRevenueMixByType(invoicesQ.rows, invoicesQ.invoices, props.range),
    [invoicesQ.rows, invoicesQ.invoices, props.range],
  );

  const waterfallSteps = useMemo(() => {
    const lab = derived.labor?.data;
    const wh = derived.warehouse?.data;
    const fatturato = derived.economic?.data.invoicesBilled ?? 0;
    if (!lab || !wh || fatturato <= 0) return [];
    return buildMarginWaterfall(fatturato, lab.manodoperaCost, wh.movementValue);
  }, [derived.labor, derived.warehouse, derived.economic]);

  const agingHeatmap = useMemo(
    () => buildClienteAgingHeatmap(invoicesQ.invoices, props.anchor),
    [invoicesQ.invoices, props.anchor],
  );

  const scadutiRows = useMemo(() => buildScadutiByCliente(invoicesQ.invoices), [invoicesQ.invoices]);

  const consuntivoRows = useMemo(
    () =>
      buildPreventivoVsConsuntivo(
        preventiviQ.records,
        invoicesQ.invoices,
        invoicesQ.links,
        props.range,
      ),
    [preventiviQ.records, invoicesQ.invoices, invoicesQ.links, props.range],
  );

  const topRows = useMemo(
    () =>
      buildTopClientiFatturatoEnriched(invoicesQ.invoices, props.range).map((r) => ({
        rank: r.rank,
        cliente: r.cliente,
        fatturato: r.fatturato,
        pct: r.pct,
        crediti: r.crediti,
        fatture: r.fatture,
      })),
    [invoicesQ.invoices, props.range],
  );

  const preventiviInRange = useMemo(
    () =>
      preventiviQ.records.filter((p) => {
        if (p.stato === "bozza") return false;
        const at = p.dataCreazione || p.aggiornatoAt;
        return isoInRange(at, props.range);
      }),
    [preventiviQ.records, props.range],
  );

  const incassoForecast = useMemo(
    () => buildIncassoForecast(invoicesQ.invoices, props.anchor),
    [invoicesQ.invoices, props.anchor],
  );

  return (
    <div className="min-w-0 space-y-4">
      <ReportSection id="report-eco-header" title="Stato finanziario" subtitle="KPI principali del periodo">
        <ReportEconomicMetricsLayout
          metrics={metrics}
          compareMode={props.analyticsContext.compareMode}
        />
      </ReportSection>

      <ReportSection id="report-eco-overview" title="Trend e confronti" subtitle="Fatturato, incassi e margine">
        <div className="space-y-4">
          <ReportRevenueCollectionChart current={revenueSeries} compare={revenueCompareSeries} />
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <ReportMarginWaterfallChart steps={waterfallSteps} />
            <ReportRevenueMixDonut slices={mixSlices} />
          </div>
        </div>
      </ReportSection>

      <ReportSection
        id="report-eco-analisi"
        title="Analisi"
        subtitle="Crediti, pipeline preventivi e previsione incassi"
        defaultCollapsed
      >
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <ReportArAgingChart points={arAgingPoints} />
          <ReportPreventiviFunnelChart rows={funnelRows} />
        </div>
        <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
          <ReportClienteAgingHeatmap rows={agingHeatmap} />
          <ReportRevenueCollectionChart
            current={incassoForecast.map((p) => ({
              monthKey: p.monthKey,
              label: p.label,
              fatturato: 0,
              incassato: p.previsto,
            }))}
            title="Previsione incasso (da scadenze)"
          />
        </div>
      </ReportSection>

      <ReportSection
        id="report-eco-dettaglio"
        title="Dettaglio operativo"
        subtitle="Fatture, crediti, preventivi e classifiche"
        defaultCollapsed
      >
        <ReportEconomicTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          invoices={invoicesQ.invoices}
          scaduti={scadutiRows}
          preventivi={preventiviInRange}
          consuntivo={consuntivoRows}
        />
        <div className="mt-6">
          <ReportDataTable configId="top-clienti" rows={topRows} />
        </div>
        <div className="mt-6">
          {perf?.economic ? (
            <KpiPerformanceEconomic data={perf.economic} />
          ) : (
            <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento analisi costi…</p>
          )}
        </div>
      </ReportSection>
    </div>
  );
}
