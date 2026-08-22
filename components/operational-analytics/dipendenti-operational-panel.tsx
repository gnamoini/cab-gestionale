"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { ReportBarChart, ReportDataTable } from "@/components/report/design-system";
import { aggregateOrePerDipendente, aggregateOrePerDipendenteDetailed } from "@/lib/report/timesheet-ore-ranking";
import { useReportTimesheetKpi } from "@/src/hooks/use-report-timesheet-kpi";
import { LoadingCardSkeleton } from "@/components/design-system";

const AnalisiOreOfficinaEmbed = dynamic(
  () =>
    import("@/components/operational-analytics/dipendenti-analisi-ore-embed").then(
      (m) => m.DipendentiAnalisiOreEmbed,
    ),
  { ssr: false, loading: () => <LoadingCardSkeleton minHeightClass="min-h-[12rem]" /> },
);

/** Owner surface: ore per dipendente + analisi officina — /dipendenti */
export function DipendentiOperationalPanel({ monthKey }: { monthKey: string }) {
  const anchor = useMemo(() => new Date(), []);
  const range = useMemo(() => {
    const [y, m] = monthKey.split("-").map(Number);
    const start = new Date(y!, m! - 1, 1, 12, 0, 0, 0);
    const end = new Date(y!, m!, 0, 12, 0, 0, 0);
    return { start, end };
  }, [monthKey]);

  const timesheet = useReportTimesheetKpi(range);

  const orePerDipendente = useMemo(
    () => aggregateOrePerDipendente(timesheet.entries, timesheet.employees),
    [timesheet.entries, timesheet.employees],
  );

  const oreChartPoints = useMemo(
    () => orePerDipendente.slice(0, 8).map((r) => ({ label: r.dipendente, value: r.ore })),
    [orePerDipendente],
  );

  const oreTableRows = useMemo(
    () => aggregateOrePerDipendenteDetailed(timesheet.entries, timesheet.employees),
    [timesheet.entries, timesheet.employees],
  );

  if (timesheet.isLoading) {
    return <LoadingCardSkeleton minHeightClass="min-h-[8rem]" />;
  }

  return (
    <ShellCard
      title="Analisi ore e produttività"
      subtitle="Distribuzione ore e officina"
      collapsible
      defaultCollapsed
      persistScope="dipendenti"
      persistKey="operational-analytics"
      data-testid="dipendenti-operational-panel"
    >
      <div className="min-w-0 space-y-4">
        {oreChartPoints.length > 0 ? (
          <ReportBarChart points={oreChartPoints} title="Ore per dipendente (top 8)" />
        ) : (
          <p className="text-sm text-[color:var(--cab-text-muted)]">Nessuna ora nel periodo.</p>
        )}
        {oreTableRows.length > 0 ? (
          <ReportDataTable configId="ore-per-dipendente" rows={oreTableRows} />
        ) : null}
        <AnalisiOreOfficinaEmbed monthKey={monthKey} />
      </div>
    </ShellCard>
  );
}
