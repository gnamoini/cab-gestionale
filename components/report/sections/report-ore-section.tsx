"use client";

import { ReportTeamTimesheetZone } from "@/components/report/layout/report-team-timesheet-zone";
import {
  useReportAnalyticsDerived,
  useReportAnalyticsDerivedActions,
} from "@/components/report/report-analytics-derived-context";
import { ReportDomainMetricsGrid } from "@/components/report/report-domain-metrics-grid";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import { usePublishWhenReady } from "@/components/report/sections/use-section-publish";
import { computeMonthTotals } from "@/lib/dipendenti/timesheet-totals";
import { useReportTimesheetKpi } from "@/src/hooks/use-report-timesheet-kpi";

export default function ReportOreSectionView(props: DomainReportSectionProps) {
  const derived = useReportAnalyticsDerived();
  const { publishLaborAnalytics } = useReportAnalyticsDerivedActions();
  const timesheet = useReportTimesheetKpi(props.range);

  const totalHours = computeMonthTotals(timesheet.entries).totaleLavorato;

  usePublishWhenReady(
    props.fetchEnabled && !timesheet.isLoading,
    [
      props.rangeKey,
      props.completate,
      props.schedeStore,
      props.costoOrario,
      props.magazzinoRows,
      totalHours,
      timesheet.isError,
    ],
    (requestId) => {
      if (timesheet.isError) return;
      publishLaborAnalytics({
        rangeKey: props.rangeKey,
        requestId,
        range: props.range,
        completate: props.completate,
        schedeStore: props.schedeStore,
        totalHours,
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
    <div className="min-w-0 space-y-8">
      <ReportDomainMetricsGrid metrics={metrics} />
      <ReportTeamTimesheetZone filterRange={props.range} embed />
    </div>
  );
}
