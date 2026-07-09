"use client";

import { ReportTeamTimesheetZone } from "@/components/report/layout/report-team-timesheet-zone";
import {
  useReportAnalyticsDerived,
  useReportAnalyticsDerivedActions,
} from "@/components/report/report-analytics-derived-context";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import { ReportDomainMetricsGrid, ReportEmbeddedModule, ReportSection } from "@/components/report/design-system";
import { usePublishWhenReady } from "@/components/report/sections/use-section-publish";
import { computeMonthTotals } from "@/lib/dipendenti/timesheet-totals";
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
        totalHours,
        compareTotalHours,
        costoOrario: props.costoOrario,
        magazzinoRows: props.magazzinoRows,
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

  return (
    <div className="min-w-0 space-y-4">
      <ReportSection id="report-ore-kpi" title="Indicatori ore" subtitle="KPI ore lavorate nel periodo">
        <ReportDomainMetricsGrid metrics={metrics} compareMode={props.analyticsContext.compareMode} />
      </ReportSection>

      <ReportSection
        id="report-ore-timesheet"
        title="Team e produttività"
        subtitle="Presenze e ore dal modulo Dipendenti"
        defaultCollapsed
      >
        <ReportEmbeddedModule label="Timesheet team">
          <ReportTeamTimesheetZone filterRange={props.range} embed />
        </ReportEmbeddedModule>
      </ReportSection>
    </div>
  );
}
