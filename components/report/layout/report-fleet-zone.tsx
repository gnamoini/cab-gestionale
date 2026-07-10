"use client";

import { ShellCard } from "@/components/gestionale/shell-card";
import { KpiPerformanceFleet } from "@/components/report/kpi-performance/kpi-performance-fleet";
import { useReportPerformanceContext } from "@/components/report/layout/report-performance-context";
import { ReportUnifiedKpiGrid } from "@/components/report/report-unified-kpi-grid";
import { reportSectionGroupDescClass, reportZoneShellClass } from "@/components/report/report-ui-tokens";
import { LoadingSkeletonBlock } from "@/components/design-system/loading/loading-skeleton";

export function ReportFleetZone() {
  const { perf, perfLoading, partitioned } = useReportPerformanceContext();

  return (
    <ShellCard
      id="report-fleet"
      title="Analisi flotta"
      subtitle="Disponibilità, fermi e guasti"
      collapsible
      defaultCollapsed={false}
      persistScope="report"
      persistKey="fleet"
      className={reportZoneShellClass}
    >
      {perfLoading || !perf ? (
        <LoadingSkeletonBlock className="min-h-[240px]" />
      ) : (
        <div className="min-w-0 space-y-8">
          {partitioned.fleet.length > 0 ? (
            <div>
              <p className={reportSectionGroupDescClass}>Indicatori flotta nel periodo.</p>
              <div className="mt-3">
                <ReportUnifiedKpiGrid items={partitioned.fleet} />
              </div>
            </div>
          ) : null}
          <KpiPerformanceFleet data={perf.fleet} />
        </div>
      )}
    </ShellCard>
  );
}
