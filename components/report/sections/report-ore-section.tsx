"use client";

import { useMemo } from "react";
import { ReportTeamTimesheetZone } from "@/components/report/layout/report-team-timesheet-zone";
import { ReportSectionTrendWidget } from "@/components/report/layout/section-trend-widget";
import {
  useReportAnalyticsDerived,
  useReportAnalyticsDerivedActions,
} from "@/components/report/report-analytics-derived-context";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import {
  ReportBarChart,
  ReportDataTable,
  ReportDomainMetricsGrid,
  ReportEmbeddedModule,
  ReportSection,
} from "@/components/report/design-system";
import { usePublishWhenReady } from "@/components/report/sections/use-section-publish";
import { computeMonthTotals } from "@/lib/dipendenti/timesheet-totals";
import { aggregateOrePerDipendente } from "@/lib/report/timesheet-ore-ranking";
import { useReportTimesheetKpi } from "@/src/hooks/use-report-timesheet-kpi";

export default function ReportOreSectionView(props: DomainReportSectionProps) {
  const derived = useReportAnalyticsDerived();
  const { publishLaborAnalytics } = useReportAnalyticsDerivedActions();
  const timesheet = useReportTimesheetKpi(props.range);
  const compareRange = props.showCompare && props.compareRange ? props.compareRange : props.range;
  const compareTimesheet = useReportTimesheetKpi(compareRange);

  const totalHours = computeMonthTotals(timesheet.entries).totaleLavorato;
  const compareTotalHours =
    props.showCompare && props.compareRange
      ? computeMonthTotals(compareTimesheet.entries).totaleLavorato
      : null;

  usePublishWhenReady(
    props.fetchEnabled && !timesheet.isLoading && (!props.showCompare || !compareTimesheet.isLoading),
    [
      props.rangeKey,
      props.completate,
      props.schedeStore,
      props.costoOrario,
      props.magazzinoRows,
      totalHours,
      compareTotalHours,
      timesheet.isError,
      compareTimesheet.isError,
      timesheet.entries,
      timesheet.employees,
    ],
    (requestId) => {
      if (timesheet.isError || (props.showCompare && compareTimesheet.isError)) return;
      publishLaborAnalytics({
        rangeKey: props.rangeKey,
        requestId,
        range: props.range,
        compareRange: props.showCompare ? props.compareRange : null,
        compareMode: props.analyticsContext.compareMode,
        completate: props.completate,
        schedeStore: props.schedeStore,
        lavListRows: props.lavListRows,
        totalHours,
        compareTotalHours,
        costoOrario: props.costoOrario,
        magazzinoRows: props.magazzinoRows,
        timesheetEntries: timesheet.entries,
        timesheetEmployees: timesheet.employees,
      });
    },
  );

  const metrics =
    derived.labor?.data.metrics.map((m) => {
      if (timesheet.isError) {
        return {
          ...m,
          state: {
            status: "error" as const,
            message: "Impossibile caricare il timesheet",
            retry: () => timesheet.refetch(),
          },
        };
      }
      if (timesheet.isLoading) {
        return { ...m, state: { status: "loading" as const } };
      }
      return m;
    }) ?? [];

  const orePerDipendente = useMemo(
    () => aggregateOrePerDipendente(timesheet.entries, timesheet.employees),
    [timesheet.entries, timesheet.employees],
  );

  const oreChartPoints = useMemo(
    () => orePerDipendente.slice(0, 8).map((r) => ({ label: r.dipendente, value: r.ore })),
    [orePerDipendente],
  );

  const oreTableRows = useMemo(
    () => orePerDipendente.map((r) => ({ dipendente: r.dipendente, ore: r.ore })),
    [orePerDipendente],
  );

  const trendPoints = useMemo(
    () => [{ label: "Ore", value: totalHours }],
    [totalHours],
  );

  return (
    <div className="min-w-0 space-y-4">
      <ReportSection id="report-ore-kpi" title="Volume ore" subtitle="Ore totali e produttività nel periodo">
        <ReportDomainMetricsGrid metrics={metrics} compareMode={props.analyticsContext.compareMode} />
        <div className="mt-4">
          <ReportSectionTrendWidget title="Trend ore" points={trendPoints} unitLabel="h" />
        </div>
      </ReportSection>

      <ReportSection
        id="report-ore-dipendenti"
        title="Produttività per dipendente"
        subtitle="Distribuzione ore lavorate nel periodo"
        defaultCollapsed={orePerDipendente.length === 0}
      >
        {oreChartPoints.length > 0 ? <ReportBarChart points={oreChartPoints} title="Ore per dipendente" /> : null}
        <div className="mt-4">
          <ReportDataTable configId="ore-per-dipendente" rows={oreTableRows} />
        </div>
      </ReportSection>

      <ReportSection
        id="report-ore-timesheet"
        title="Team e timesheet"
        subtitle="Dettaglio presenze dal modulo Dipendenti"
        defaultCollapsed
      >
        <ReportEmbeddedModule label="Timesheet team">
          <ReportTeamTimesheetZone filterRange={props.range} embed />
        </ReportEmbeddedModule>
      </ReportSection>
    </div>
  );
}
