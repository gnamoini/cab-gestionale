"use client";

import { useMemo } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { KpiPerformanceAlerts } from "@/components/report/kpi-performance/kpi-performance-alerts";
import { ReportExecutiveStrip } from "@/components/report/layout/report-executive-strip";
import { useReportPerformanceContext } from "@/components/report/layout/report-performance-gate";
import { reportSubsectionTitleClass, reportZoneShellClass } from "@/components/report/report-ui-tokens";
import type { ReportCompareMode } from "@/lib/report/date-ranges";
import { countClientiSottoSogliaDisponibilita } from "@/lib/report/kpi-performance/kpi-performance-formulas";
import { LoadingSkeletonBlock } from "@/components/design-system/loading/loading-skeleton";

export function ReportExecutiveOverview({ compareMode }: { compareMode: ReportCompareMode }) {
  const { perf, perfLoading } = useReportPerformanceContext();

  const summaryLine = useMemo(() => {
    if (!perf) return "Caricamento sintesi…";
    const alertN = perf.alerts.length;
    const alertPart = alertN > 0 ? `${alertN} alert attivi` : "nessun alert critico";
    return `${perf.operational.closedInPeriod} chiusure · ${perf.operational.openCount} aperti · ${alertPart}`;
  }, [perf]);

  return (
    <ShellCard
      id="report-executive"
      title="Panoramica esecutiva"
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
              peggiorDisponibilita: perf.fleet.peggiorDisponibilita,
              clientiSottoSoglia: countClientiSottoSogliaDisponibilita(perf.fleet.disponibilitaPerCliente),
              mezziInOfficina: perf.fleet.mezziInOfficina,
              totalMezzi: perf.fleet.totalMezzi,
              alertCount: perf.alerts.length,
              criticalAlertCount: perf.alerts.filter((a) => a.severity === "critical").length,
            }}
          />

          {perf.alerts.length > 0 ? (
            <section className="min-w-0 space-y-3 border-t border-[color:var(--cab-border)] pt-6" aria-labelledby="report-executive-alerts-title">
              <h2 id="report-executive-alerts-title" className={reportSubsectionTitleClass}>
                Alert e criticità
              </h2>
              <KpiPerformanceAlerts alerts={perf.alerts} />
            </section>
          ) : null}
        </div>
      )}
    </ShellCard>
  );
}
