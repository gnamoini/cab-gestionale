"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useReportAnalyticsDerivedActions } from "@/components/report/report-analytics-derived-context";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import { computeMonthTotals } from "@/lib/dipendenti/timesheet-totals";
import { countCompletedInRange } from "@/lib/report/lavorazioni-report-selectors";
import { buildResiduoDaFatturare } from "@/lib/report/economic-analytics-extended";
import {
  sumManodoperaCostFromSchede,
  sumRicambiCostFromMagLog,
} from "@/lib/report/kpi-performance/kpi-performance-formulas";
import { prefetchReportEconomicQueries } from "@/lib/report/prefetch-report-economic-queries";
import { useInvoicesQuery } from "@/src/hooks/gestionale/use-invoices-query";
import { useOrdiniFornitoriQuery } from "@/src/hooks/gestionale/use-ordini-fornitori-query";
import { usePreventiviRecordsQuery } from "@/src/hooks/gestionale/use-preventivi-records-query";
import { useReportTimesheetKpi } from "@/src/hooks/use-report-timesheet-kpi";
import { ddtEntry } from "@/lib/domain/ddt-entry";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { QK } from "@/src/lib/react-query/query-keys";
import type { DdtListPayload } from "@/lib/ddt/types";
import type { ServiceResult } from "@/src/services/service-result";

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
  | "magLog"
  | "prodotti"
  | "magazzinoRows"
  | "schedeStore"
  | "costoOrario"
>;

function useReportDdtDocumentsQuery(enabled: boolean, rangeKey: string) {
  const gestOpts = useGestionaleQueryOpts();
  const queryKey = [...QK.ddt, "report", rangeKey] as const;
  return useServiceQuery<DdtListPayload, typeof queryKey>(
    queryKey,
    () => ddtEntry.getList() as Promise<ServiceResult<DdtListPayload>>,
    { enabled, ...gestOpts },
  );
}

/** ponytail: prefetch all derived domains on page load — sections may republish with fresher requestId. */
export function useReportDerivedPrefetch(props: PrefetchProps) {
  const queryClient = useQueryClient();
  const {
    publishOperationalAnalytics,
    publishWarehouseAnalytics,
    publishLaborAnalytics,
    publishEconomicAnalytics,
  } = useReportAnalyticsDerivedActions();

  const preventiviQ = usePreventiviRecordsQuery(true);
  const invoicesQ = useInvoicesQuery(true);
  const ordiniQ = useOrdiniFornitoriQuery(true);
  const ddtQ = useReportDdtDocumentsQuery(true, props.rangeKey);
  const timesheet = useReportTimesheetKpi(props.range);
  const compareRange = props.showCompare && props.compareRange ? props.compareRange : props.range;
  const compareTimesheet = useReportTimesheetKpi(compareRange);

  const reqRef = useRef(0);

  useEffect(() => {
    void prefetchReportEconomicQueries(queryClient);
  }, [queryClient]);

  useEffect(() => {
    reqRef.current += 1;
    const requestId = reqRef.current;
    const compareInput = {
      compareRange: props.showCompare ? props.compareRange : null,
      compareMode: props.analyticsContext.compareMode,
    };

    publishOperationalAnalytics({
      rangeKey: props.rangeKey,
      requestId,
      range: props.range,
      ...compareInput,
      attive: props.attive,
      storico: props.storico,
      completate: props.completate,
      lavRows: props.lavListRows,
      manualByMonth: props.manualByMonth,
    });

    if (!ordiniQ.isLoading && !ordiniQ.isError) {
      publishWarehouseAnalytics({
        rangeKey: props.rangeKey,
        requestId,
        range: props.range,
        ...compareInput,
        magLog: props.magLog,
        magazzino: props.prodotti,
        magazzinoRows: props.magazzinoRows,
        ordini: ordiniQ.records,
      });
    }

    const totalHours = computeMonthTotals(timesheet.entries).totaleLavorato;
    const compareTotalHours =
      props.showCompare && props.compareRange
        ? computeMonthTotals(compareTimesheet.entries).totaleLavorato
        : null;

    if (!timesheet.isLoading && (!props.showCompare || !compareTimesheet.isLoading)) {
      publishLaborAnalytics({
        rangeKey: props.rangeKey,
        requestId,
        range: props.range,
        ...compareInput,
        completate: props.completate,
        schedeStore: props.schedeStore,
        totalHours,
        compareTotalHours,
        costoOrario: props.costoOrario,
        magazzinoRows: props.magazzinoRows,
        timesheetEntries: timesheet.entries,
        timesheetEmployees: timesheet.employees,
      });
    }

    if (
      !preventiviQ.isLoading &&
      !invoicesQ.isLoading &&
      !ddtQ.isLoading &&
      !preventiviQ.isError &&
      !invoicesQ.isError &&
      !ddtQ.isError
    ) {
      const completed = countCompletedInRange(props.completate, props.range, props.manualByMonth);
      const completedPrev =
        props.showCompare && props.compareRange
          ? countCompletedInRange(props.completate, props.compareRange, props.manualByMonth)
          : null;

      const manodoperaCost = sumManodoperaCostFromSchede(
        props.completate,
        props.range,
        props.schedeStore,
        props.costoOrario,
        props.magazzinoRows,
      ).manodopera;
      const movementValue = sumRicambiCostFromMagLog(props.magLog, props.prodotti, props.range);
      const billingResiduo =
        invoicesQ.payload?.preventiviBilling && invoicesQ.payload.preventiviBilling.length > 0
          ? buildResiduoDaFatturare(invoicesQ.payload.preventiviBilling)
          : null;

      publishEconomicAnalytics({
        rangeKey: props.rangeKey,
        requestId,
        range: props.range,
        ...compareInput,
        preventivi: preventiviQ.records,
        invoices: invoicesQ.invoices,
        invoicePayments: invoicesQ.payload?.payments ?? [],
        preventiviBilling: invoicesQ.payload?.preventiviBilling ?? [],
        ddtDocuments: ddtQ.data?.documents ?? [],
        derivedHints: {
          completedInPeriod: completed,
          completedInPeriodPrev: completedPrev,
          manodoperaCost,
          movementValue,
          billingResiduo,
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
    props.magLog,
    props.prodotti,
    props.magazzinoRows,
    props.schedeStore,
    props.costoOrario,
    props.analyticsContext.compareMode,
    preventiviQ.isLoading,
    preventiviQ.isError,
    preventiviQ.records,
    invoicesQ.isLoading,
    invoicesQ.isError,
    invoicesQ.invoices,
    invoicesQ.payload,
    ordiniQ.isLoading,
    ordiniQ.isError,
    ordiniQ.records,
    ddtQ.isLoading,
    ddtQ.isError,
    ddtQ.data?.documents,
    timesheet.isLoading,
    timesheet.entries,
    timesheet.employees,
    compareTimesheet.isLoading,
    compareTimesheet.entries,
    publishOperationalAnalytics,
    publishWarehouseAnalytics,
    publishLaborAnalytics,
    publishEconomicAnalytics,
  ]);
}
