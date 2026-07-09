"use client";

import { useMemo } from "react";
import type { DdtListPayload } from "@/lib/ddt/types";
import { ddtEntry } from "@/lib/domain/ddt-entry";
import {
  useReportAnalyticsDerived,
  useReportAnalyticsDerivedActions,
} from "@/components/report/report-analytics-derived-context";
import { ReportDomainMetricsGrid } from "@/components/report/report-domain-metrics-grid";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import { usePublishWhenReady } from "@/components/report/sections/use-section-publish";
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

  usePublishWhenReady(
    props.fetchEnabled && !loading,
    [
      props.rangeKey,
      preventiviQ.records,
      invoicesQ.invoices,
      ddtQ.data?.documents,
      isError,
    ],
    (requestId) => {
      if (isError) return;
      publishEconomicAnalytics({
        rangeKey: props.rangeKey,
        requestId,
        range: props.range,
        preventivi: preventiviQ.records,
        invoices: invoicesQ.invoices,
        ddtDocuments: ddtQ.data?.documents ?? [],
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
  }, [derived.economic, isError, loading]);

  return (
    <div className="min-w-0 space-y-6">
      <ReportDomainMetricsGrid metrics={metrics} />
    </div>
  );
}
