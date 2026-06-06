"use client";

import Link from "next/link";
import { ShellCard } from "@/components/gestionale/shell-card";
import { KpiPerformanceOperational } from "@/components/report/kpi-performance/kpi-performance-operational";
import { useReportPerformanceContext } from "@/components/report/layout/report-performance-gate";
import { ReportLavorazioniTemporalSection } from "@/components/report/report-lavorazioni-temporal-section";
import {
  reportSectionGroupDescClass,
  reportSubsectionTitleClass,
  reportZoneShellClass,
} from "@/components/report/report-ui-tokens";
import type { DateRange } from "@/lib/report/date-ranges";
import type { ReportSemanticIndex } from "@/lib/report/report-semantic-index";
import { LoadingSkeletonBlock } from "@/components/design-system/loading/loading-skeleton";
import { dsBtnNeutral } from "@/lib/ui/design-system";

export function ReportTrendsZone({
  filterRange,
  anchor,
  semanticIndex,
}: {
  filterRange: DateRange;
  anchor: Date;
  semanticIndex: ReportSemanticIndex;
}) {
  const { perf, perfLoading } = useReportPerformanceContext();

  return (
    <ShellCard
      id="report-trends"
      title="Trend e andamento"
      subtitle="Evoluzione interventi e ritmo mensile nel periodo"
      collapsible
      defaultCollapsed={false}
      className={reportZoneShellClass}
    >
      <div className="min-w-0 space-y-8">
        {perfLoading || !perf ? (
          <LoadingSkeletonBlock className="min-h-[200px]" />
        ) : (
          <>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <p className={reportSectionGroupDescClass}>
                Confronto mensile delle chiusure e segnali euristici sui guasti (da testo note/stato).
              </p>
              <Link href="#report-maintenance" className={`${dsBtnNeutral} text-xs no-underline`}>
                Matrici e tabelle
              </Link>
            </div>
            <KpiPerformanceOperational data={perf.operational} />
          </>
        )}

        <section className="min-w-0 space-y-3" aria-labelledby="report-trends-temporal-title">
          <h2 id="report-trends-temporal-title" className={reportSubsectionTitleClass}>
            Ritmo mensile (anno)
          </h2>
          <p className={reportSectionGroupDescClass}>
            Chiusure per mese con espansione settimanale — stesso dataset della sezione approfondimenti.
          </p>
          <ReportLavorazioniTemporalSection
            filterRange={filterRange}
            anchor={anchor}
            semanticIndex={semanticIndex}
            embed
            showKpiChart
            showTable={false}
          />
        </section>
      </div>
    </ShellCard>
  );
}
