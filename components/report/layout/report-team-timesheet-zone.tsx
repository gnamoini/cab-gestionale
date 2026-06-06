"use client";

import Link from "next/link";
import { GestionaleSectionGate } from "@/components/gestionale/gestionale-section-gate";
import { TimesheetKPIGrid } from "@/components/gestionale/dipendenti/timesheet-kpi-grid";
import { ShellCard } from "@/components/gestionale/shell-card";
import { LoadingErrorState, LoadingCardSkeleton } from "@/components/design-system";
import { reportSectionGroupDescClass, reportZoneShellClass } from "@/components/report/report-ui-tokens";
import type { DateRange } from "@/lib/report/date-ranges";
import { dsBtnNeutral } from "@/lib/ui/design-system";
import { useReportTimesheetKpi } from "@/src/hooks/use-report-timesheet-kpi";

export function ReportTeamTimesheetZone({
  filterRange,
  embed = false,
}: {
  filterRange: DateRange;
  embed?: boolean;
}) {
  const kpi = useReportTimesheetKpi(filterRange);

  const body = (
    <>
      {kpi.isLoading ? (
        <LoadingCardSkeleton minHeightClass="min-h-[280px]" rows={4} />
      ) : kpi.isError ? (
        <LoadingErrorState
          title="KPI dipendenti non disponibili"
          description="Impossibile caricare registro o presenze per il periodo."
          onRetry={kpi.refetch}
        />
      ) : (
        <TimesheetKPIGrid
          employees={kpi.employees}
          entries={kpi.entries}
          previousMonthEntries={kpi.previousMonthEntries}
          showMonthDelta={kpi.singleMonth}
        />
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/dipendenti" className={`${dsBtnNeutral} inline-flex text-sm no-underline`}>
          Apri timesheet dipendenti
        </Link>
      </div>
    </>
  );

  const content = (
    <GestionaleSectionGate module="dipendenti">
      {embed ? (
        <div className="min-w-0">
          <p className={reportSectionGroupDescClass}>
            Ore e presenze dal modulo Dipendenti ({kpi.periodLabel}). Weekend e festività esclusi dagli
            indicatori.
          </p>
          <div className="mt-4 min-w-0">{body}</div>
        </div>
      ) : (
        <>
          <p className={reportSectionGroupDescClass}>
            Ore e presenze dal modulo{" "}
            <Link href="/dipendenti" className="font-medium text-[color:var(--cab-text)] underline-offset-2 hover:underline">
              Dipendenti
            </Link>
            , allineate al periodo selezionato. Weekend e festività esclusi dagli indicatori.
          </p>
          <div className="mt-4 min-w-0">{body}</div>
        </>
      )}
    </GestionaleSectionGate>
  );

  if (embed) return content;

  return (
    <ShellCard
      id="report-team"
      title="Team e produttività"
      subtitle={`KPI dipendenti — ${kpi.periodLabel}`}
      collapsible
      defaultCollapsed={false}
      className={reportZoneShellClass}
    >
      {content}
    </ShellCard>
  );
}
