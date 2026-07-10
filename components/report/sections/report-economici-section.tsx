"use client";

import { useMemo } from "react";
import {
  useReportAnalyticsDerived,
  useReportAnalyticsDerivedActions,
} from "@/components/report/report-analytics-derived-context";
import { useReportPerformanceContext } from "@/components/report/layout/report-performance-context";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import {
  ReportDataTable,
  ReportDomainMetricsGrid,
  ReportLineChart,
  ReportSection,
  ReportUnifiedKpiGrid,
} from "@/components/report/design-system";
import { usePublishWhenReady } from "@/components/report/sections/use-section-publish";
import { aggregateInvoicesByMonth } from "@/lib/report/economic-period-aggregate";
import { buildTopClientiByFatturato } from "@/lib/report/report-classifiche";
import { countCompletedInRange } from "@/lib/report/lavorazioni-report-selectors";
import type { DdtListPayload } from "@/lib/ddt/types";
import { ddtEntry } from "@/lib/domain/ddt-entry";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { useInvoicesQuery } from "@/src/hooks/gestionale/use-invoices-query";
import { usePreventiviRecordsQuery } from "@/src/hooks/gestionale/use-preventivi-records-query";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { QK } from "@/src/lib/react-query/query-keys";
import type { ServiceResult } from "@/src/services/service-result";

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
  const { partitioned } = useReportPerformanceContext();
  const { publishEconomicAnalytics } = useReportAnalyticsDerivedActions();
  const preventiviQ = usePreventiviRecordsQuery(props.fetchEnabled);
  const invoicesQ = useInvoicesQuery(props.fetchEnabled);
  const ddtQ = useReportDdtDocumentsQuery(props.fetchEnabled, props.rangeKey);

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
    return {
      completedInPeriod: op?.completedInPeriod ?? null,
      completedInPeriodPrev: completedPrev,
      manodoperaCost: lab?.manodoperaCost ?? null,
      movementValue: wh?.movementValue ?? null,
    };
  }, [
    derived.operational,
    derived.labor,
    derived.warehouse,
    props.showCompare,
    props.compareRange,
    props.completate,
    props.manualByMonth,
  ]);

  usePublishWhenReady(
    props.fetchEnabled && !loading,
    [
      props.rangeKey,
      preventiviQ.records,
      invoicesQ.invoices,
      ddtQ.data?.documents,
      isError,
      derivedHints.completedInPeriod,
      derivedHints.manodoperaCost,
      derivedHints.movementValue,
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
        ddtDocuments: ddtQ.data?.documents ?? [],
        derivedHints,
      });
    },
  );

  const metrics = useMemo(() => {
    if (!derived.economic) return [];
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
  }, [derived.economic, isError, loading, refetchAll]);

  const invoiceSeries = useMemo(
    () => aggregateInvoicesByMonth(invoicesQ.invoices, props.range),
    [invoicesQ.invoices, props.range],
  );

  const topClientiFatturato = useMemo(
    () => buildTopClientiByFatturato(invoicesQ.invoices, props.range),
    [invoicesQ.invoices, props.range],
  );

  const topRows = useMemo(
    () =>
      topClientiFatturato.map((r) => ({
        rank: r.rank,
        cliente: r.cliente,
        fatturato: r.fatturato,
        fatture: r.fatture,
      })),
    [topClientiFatturato],
  );

  return (
    <div className="min-w-0 space-y-4">
      <ReportSection
        id="report-eco-kpi"
        title="Salute economica"
        subtitle="Preventivi, fatturato, margine stimato e indicatori derivati"
      >
        {partitioned.economic.length > 0 ? (
          <div className="mb-4">
            <ReportUnifiedKpiGrid
              items={partitioned.economic}
              compareMode={props.analyticsContext.compareMode}
            />
          </div>
        ) : null}
        <ReportDomainMetricsGrid metrics={metrics} compareMode={props.analyticsContext.compareMode} />
      </ReportSection>

      <ReportSection
        id="report-eco-chart"
        title="Andamento fatturato"
        subtitle="Totale fatture emesse per mese nel periodo"
        defaultCollapsed
      >
        <ReportLineChart
          title="Fatturato mensile"
          rows={invoiceSeries.map((p) => ({ label: p.label, value: p.value }))}
        />
      </ReportSection>

      <ReportSection
        id="report-eco-top-clienti"
        title="Top clienti per fatturato"
        subtitle="Classifica per importo fatturato nel periodo"
        defaultCollapsed
      >
        <ReportDataTable configId="top-clienti" rows={topRows} />
      </ReportSection>
    </div>
  );
}
