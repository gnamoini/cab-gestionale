"use client";

import { useMemo } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { KpiPerformanceAlerts } from "@/components/report/kpi-performance/kpi-performance-alerts";
import { ReportExecutiveStrip } from "@/components/report/layout/report-executive-strip";
import { useReportPerformanceContext } from "@/components/report/layout/report-performance-context";
import { ReportSubsection } from "@/components/report/sections/report-subsection";
import { reportZoneShellClass } from "@/components/report/report-ui-tokens";
import type { ReportCompareMode } from "@/lib/report/date-ranges";
import { countClientiSottoSogliaDisponibilita } from "@/lib/report/kpi-performance/kpi-performance-formulas";
import { LoadingSkeletonBlock } from "@/components/design-system/loading/loading-skeleton";

export function ReportExecutiveOverviewContent({ compareMode }: { compareMode: ReportCompareMode }) {
  const { perf, perfLoading } = useReportPerformanceContext();

  const summaryLine = useMemo(() => {
    if (!perf) return "Caricamento sintesi…";
    const alertN = perf.alerts.length;
    const alertPart = alertN > 0 ? `${alertN} alert attivi` : "nessun alert critico";
    return `${perf.operational.closedInPeriod} chiusure · ${perf.operational.openCount} aperti · ${alertPart}`;
  }, [perf]);

  if (perfLoading || !perf) {
    return (
      <div className="min-w-0 space-y-4" aria-busy="true">
        <LoadingSkeletonBlock className="min-h-[3.5rem]" />
        <LoadingSkeletonBlock className="min-h-[200px]" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <ReportSubsection
        id="report-executive-summary"
        title="Sintesi operativa"
        subtitle="Stato officina e flotta nel periodo selezionato"
      >
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
      </ReportSubsection>

      {perf.alerts.length > 0 ? (
        <ReportSubsection
          id="report-executive-alerts"
          title="Alert e criticità"
          subtitle={`${perf.alerts.length} segnalazioni attive`}
          defaultCollapsed
        >
          <KpiPerformanceAlerts alerts={perf.alerts} />
        </ReportSubsection>
      ) : null}
    </div>
  );
}

/** @deprecated Usare sezione REPORT `panoramica` — mantenuto per zone legacy. */
export function ReportExecutiveOverview({ compareMode }: { compareMode: ReportCompareMode }) {
  return (
    <ShellCard
      id="report-executive"
      title="Panoramica esecutiva"
      subtitle="Stato officina e flotta nel periodo selezionato"
      collapsible={false}
      className={reportZoneShellClass}
    >
      <ReportExecutiveOverviewContent compareMode={compareMode} />
    </ShellCard>
  );
}
