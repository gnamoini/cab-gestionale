"use client";

import { useMemo } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { KpiPerformanceAlerts } from "@/components/report/kpi-performance/kpi-performance-alerts";
import { ReportExecutiveStrip } from "@/components/report/layout/report-executive-strip";
import { useReportPerformanceContext } from "@/components/report/layout/report-performance-gate";
import { ReportUnifiedKpiGrid } from "@/components/report/report-unified-kpi-grid";
import { reportSectionGroupDescClass, reportZoneShellClass } from "@/components/report/report-ui-tokens";
import type { ReportCompareMode } from "@/lib/report/date-ranges";
import { LoadingSkeletonBlock } from "@/components/design-system/loading/loading-skeleton";

export function ReportExecutiveOverview({ compareMode }: { compareMode: ReportCompareMode }) {
  const { perf, perfLoading, partitioned } = useReportPerformanceContext();

  const summaryLine = useMemo(() => {
    if (!perf) return "Caricamento sintesi…";
    const alertN = perf.alerts.length;
    const alertPart = alertN > 0 ? `${alertN} alert attivi` : "nessun alert critico";
    return `${perf.operational.closedInPeriod} chiusure nel periodo · ${perf.operational.openCount} interventi aperti · ${alertPart}`;
  }, [perf]);

  return (
    <ShellCard
      id="report-executive"
      title="Sintesi esecutiva"
      subtitle="Stato officina e flotta nel periodo selezionato"
      collapsible={false}
      className={reportZoneShellClass}
    >
      {perfLoading || !perf ? (
        <div className="min-w-0 space-y-4" aria-busy="true">
          <LoadingSkeletonBlock className="min-h-[3.5rem]" />
          <LoadingSkeletonBlock className="min-h-[200px]" />
        </div>
      ) : (
        <div className="min-w-0 space-y-6">
          <ReportExecutiveStrip
            summaryLine={summaryLine}
            compareActive={compareMode !== "none"}
            health={{
              disponibilitaPct: perf.fleet.disponibilitaPct,
              mezziInOfficina: perf.fleet.mezziInOfficina,
              totalMezzi: perf.fleet.totalMezzi,
              alertCount: perf.alerts.length,
              criticalAlertCount: perf.alerts.filter((a) => a.severity === "critical").length,
            }}
          />

          <div>
            <p className={reportSectionGroupDescClass}>
              Indicatori strategici. Le pillole indicano il livello di affidabilità del dato (esatto, stima, proxy).
            </p>
            <div className="mt-3">
              <ReportUnifiedKpiGrid items={partitioned.executive} />
            </div>
          </div>

          <section className="min-w-0 space-y-3" aria-labelledby="report-executive-alerts-title">
            <h2 id="report-executive-alerts-title" className="text-sm font-semibold text-[color:var(--cab-text)]">
              Alert e criticità
            </h2>
            <KpiPerformanceAlerts alerts={perf.alerts} />
          </section>
        </div>
      )}
    </ShellCard>
  );
}
