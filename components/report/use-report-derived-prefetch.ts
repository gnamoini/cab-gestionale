"use client";

import { useEffect, useRef } from "react";
import { useReportAnalyticsDerivedActions } from "@/components/report/report-analytics-derived-context";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import { countCompletedInRange } from "@/lib/report/lavorazioni-report-selectors";
import { usePreventiviRecordsQuery } from "@/src/hooks/gestionale/use-preventivi-records-query";
import { useInvoicesQuery } from "@/src/hooks/gestionale/use-invoices-query";

type PrefetchProps = Pick<
  DomainReportSectionProps,
  | "rangeKey"
  | "range"
  | "compareRange"
  | "showCompare"
  | "attive"
  | "storico"
  | "completate"
  | "lavListRows"
  | "manualByMonth"
  | "analyticsContext"
>;

/** ponytail: prefetch high-priority derived on period change — sections may republish with fresher requestId. */
export function useReportDerivedPrefetch(props: PrefetchProps) {
  const { publishOperationalAnalytics, publishEconomicAnalytics } = useReportAnalyticsDerivedActions();
  const preventiviQ = usePreventiviRecordsQuery(true);
  const invoicesQ = useInvoicesQuery(true);
  const reqRef = useRef(0);

  useEffect(() => {
    reqRef.current += 1;
    const requestId = reqRef.current;

    publishOperationalAnalytics({
      rangeKey: props.rangeKey,
      requestId,
      range: props.range,
      compareRange: props.showCompare ? props.compareRange : null,
      compareMode: props.analyticsContext.compareMode,
      attive: props.attive,
      storico: props.storico,
      completate: props.completate,
      lavRows: props.lavListRows,
      manualByMonth: props.manualByMonth,
    });

    if (!preventiviQ.isLoading && !invoicesQ.isLoading && !preventiviQ.isError && !invoicesQ.isError) {
      const completed = countCompletedInRange(props.completate, props.range, props.manualByMonth);
      const completedPrev =
        props.showCompare && props.compareRange
          ? countCompletedInRange(props.completate, props.compareRange, props.manualByMonth)
          : null;

      publishEconomicAnalytics({
        rangeKey: props.rangeKey,
        requestId,
        range: props.range,
        compareRange: props.showCompare ? props.compareRange : null,
        compareMode: props.analyticsContext.compareMode,
        preventivi: preventiviQ.records,
        invoices: invoicesQ.invoices,
        ddtDocuments: [],
        derivedHints: {
          completedInPeriod: completed,
          completedInPeriodPrev: completedPrev,
        },
      });
    }
  }, [
    props.rangeKey,
    props.range,
    props.compareRange,
    props.showCompare,
    props.attive,
    props.storico,
    props.completate,
    props.lavListRows,
    props.manualByMonth,
    props.analyticsContext.compareMode,
    preventiviQ.isLoading,
    preventiviQ.isError,
    preventiviQ.records,
    invoicesQ.isLoading,
    invoicesQ.isError,
    invoicesQ.invoices,
    publishOperationalAnalytics,
    publishEconomicAnalytics,
  ]);
}
