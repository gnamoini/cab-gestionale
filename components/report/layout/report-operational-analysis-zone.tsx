"use client";

import { ShellCard } from "@/components/gestionale/shell-card";
import { KpiPerformanceEconomic } from "@/components/report/kpi-performance/kpi-performance-economic";
import { KpiPerformanceFleet } from "@/components/report/kpi-performance/kpi-performance-fleet";
import { useReportPerformanceContext } from "@/components/report/layout/report-performance-gate";
import { ReportTeamTimesheetZone } from "@/components/report/layout/report-team-timesheet-zone";
import { ReportUnifiedKpiGrid } from "@/components/report/report-unified-kpi-grid";
import {
  reportSectionGroupDescClass,
  reportSubsectionTitleClass,
  reportZoneShellClass,
} from "@/components/report/report-ui-tokens";
import type { DateRange } from "@/lib/report/date-ranges";
import type { UnifiedKpiDisplayItem } from "@/lib/report/kpi-performance/merge-unified-kpi-display";
import { LoadingSkeletonBlock } from "@/components/design-system/loading/loading-skeleton";

function OperationalKpiBlock({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: UnifiedKpiDisplayItem[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className={reportSubsectionTitleClass}>{title}</h3>
      <p className={`mt-1 ${reportSectionGroupDescClass}`}>{description}</p>
      <div className="mt-3">
        <ReportUnifiedKpiGrid items={items} variant="compact" />
      </div>
    </div>
  );
}

export function ReportOperationalAnalysisZone({ filterRange }: { filterRange: DateRange }) {
  const { perf, perfLoading, partitioned } = useReportPerformanceContext();

  return (
    <ShellCard
      id="report-operational"
      title="Analisi operative"
      subtitle="Flotta, economia e produttività del team"
      collapsible
      defaultCollapsed={false}
      className={reportZoneShellClass}
    >
      <div className="min-w-0 space-y-10">
        {perfLoading || !perf ? (
          <LoadingSkeletonBlock className="min-h-[200px]" />
        ) : (
          <>
            <section className="min-w-0 space-y-6" aria-labelledby="report-op-fleet-title">
              <div>
                <h2 id="report-op-fleet-title" className={reportSubsectionTitleClass}>
                  Flotta e disponibilità
                </h2>
                <p className={`mt-1 ${reportSectionGroupDescClass}`}>
                  Guasti per tipo attrezzatura, mezzi a rischio e indicatori di officina.
                </p>
              </div>
              <OperationalKpiBlock
                title="Indicatori flotta"
                description="Mezzi in officina e totale anagrafica."
                items={partitioned.fleet}
              />
              <KpiPerformanceFleet data={perf.fleet} />
            </section>

            <section
              className="min-w-0 space-y-6 border-t border-[color:var(--cab-border)] pt-8"
              aria-labelledby="report-op-economic-title"
            >
              <div>
                <h2 id="report-op-economic-title" className={reportSubsectionTitleClass}>
                  Economia e magazzino
                </h2>
                <p className={`mt-1 ${reportSectionGroupDescClass}`}>
                  Costi stimati da schede, movimenti ricambi e valore stock.
                </p>
              </div>
              <OperationalKpiBlock
                title="Indicatori economici"
                description="Capitale a costo e uscite ricambi nel periodo."
                items={partitioned.economic}
              />
              <KpiPerformanceEconomic data={perf.economic} />
            </section>
          </>
        )}

        <section className="min-w-0 border-t border-[color:var(--cab-border)] pt-8" aria-labelledby="report-op-team-title">
          <h2 id="report-op-team-title" className={reportSubsectionTitleClass}>
            Team e ore lavorate
          </h2>
          <p className={`mt-1 ${reportSectionGroupDescClass}`}>
            Produttività dipendenti allineata al periodo selezionato — espandibile dal modulo Dipendenti.
          </p>
          <div className="mt-4">
            <ReportTeamTimesheetZone filterRange={filterRange} embed />
          </div>
        </section>
      </div>
    </ShellCard>
  );
}
