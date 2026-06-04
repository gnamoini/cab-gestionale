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

export function ReportTeamTimesheetZone({ filterRange }: { filterRange: DateRange }) {
  const kpi = useReportTimesheetKpi(filterRange);

  return (
    <GestionaleSectionGate module="dipendenti">
      <ShellCard
        id="report-team"
        title="Indicatori"
        subtitle={`KPI — ${kpi.periodLabel}`}
        collapsible
        defaultCollapsed={false}
        className={reportZoneShellClass}
      >
        <p className={reportSectionGroupDescClass}>
          Ore e presenze dal modulo{" "}
          <Link href="/dipendenti" className="font-medium text-[color:var(--cab-text)] underline-offset-2 hover:underline">
            Dipendenti
          </Link>
          , allineate al periodo selezionato in toolbar. Negli indicatori non si contano le assenze registrate nei
          weekend né quelle di tipo festività.
        </p>

        <div className="mt-4 min-w-0">
          {kpi.isLoading ? (
            <LoadingCardSkeleton minHeightClass="min-h-[320px]" rows={4} />
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
        </div>

        <div className="mt-4">
          <Link href="/dipendenti" className={`${dsBtnNeutral} inline-flex text-sm no-underline`}>
            Apri timesheet dipendenti
          </Link>
        </div>
      </ShellCard>
    </GestionaleSectionGate>
  );
}
