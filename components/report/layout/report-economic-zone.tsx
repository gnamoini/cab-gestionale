"use client";

import { ShellCard } from "@/components/gestionale/shell-card";
import { KpiPerformanceEconomic } from "@/components/report/kpi-performance/kpi-performance-economic";
import { useReportPerformanceContext } from "@/components/report/layout/report-performance-gate";
import { ReportUnifiedKpiGrid } from "@/components/report/report-unified-kpi-grid";
import { reportSectionGroupDescClass, reportZoneShellClass } from "@/components/report/report-ui-tokens";
import { LoadingSkeletonBlock } from "@/components/design-system/loading/loading-skeleton";

export function ReportEconomicZone() {
  const { perf, perfLoading, partitioned } = useReportPerformanceContext();

  return (
    <ShellCard
      id="report-economic"
      title="Analisi economica"
      subtitle="Costi, magazzino e driver di spesa"
      collapsible
      defaultCollapsed={false}
      className={reportZoneShellClass}
    >
      {perfLoading || !perf ? (
        <LoadingSkeletonBlock className="min-h-[240px]" />
      ) : (
        <div className="min-w-0 space-y-8">
          {partitioned.economic.length > 0 ? (
            <div>
              <p className={reportSectionGroupDescClass}>Stock e movimenti ricambi nel periodo.</p>
              <div className="mt-3">
                <ReportUnifiedKpiGrid items={partitioned.economic} />
              </div>
            </div>
          ) : null}
          <KpiPerformanceEconomic data={perf.economic} />
        </div>
      )}
    </ShellCard>
  );
}
