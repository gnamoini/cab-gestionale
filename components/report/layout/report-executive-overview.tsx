"use client";

import { useMemo } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { KpiPerformanceAlertCard } from "@/components/report/kpi-performance/kpi-performance-alerts";
import { ReportExecutiveStrip } from "@/components/report/layout/report-executive-strip";
import { useReportPerformanceContext } from "@/components/report/layout/report-performance-context";
import { ReportSection } from "@/components/report/design-system";
import { reportZoneShellClass } from "@/components/report/report-ui-tokens";
import type { ReportCompareMode } from "@/lib/report/date-ranges";
import type { KpiPerformanceAlert } from "@/lib/report/kpi-performance/kpi-performance-types";
import { countClientiSottoSogliaDisponibilita } from "@/lib/report/kpi-performance/kpi-performance-formulas";
import { LoadingSkeletonBlock } from "@/components/design-system/loading/loading-skeleton";

export function ReportExecutiveSummaryContent({ compareMode }: { compareMode: ReportCompareMode }) {
  const { perf, perfLoading } = useReportPerformanceContext();

  const summaryLine = useMemo(() => {
    if (!perf) return "Caricamento sintesi…";
    const alertN = perf.alerts.length;
    const alertPart = alertN > 0 ? `${alertN} alert attivi` : "nessun alert critico";
    return `${perf.operational.closedInPeriod} chiusure · ${perf.operational.openCount} aperti · ${alertPart}`;
  }, [perf]);

  if (perfLoading || !perf) {
    return <LoadingSkeletonBlock className="min-h-[3.5rem]" aria-busy="true" />;
  }

  return (
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
  );
}

export function ReportExecutiveAlertSections() {
  const { perf, perfLoading } = useReportPerformanceContext();

  if (perfLoading || !perf) {
    return <LoadingSkeletonBlock className="min-h-[4rem]" aria-busy="true" />;
  }

  if (perf.alerts.length === 0) return null;

  const severitySubtitle: Record<KpiPerformanceAlert["severity"], string> = {
    critical: "Criticità alta",
    warning: "Attenzione richiesta",
    info: "Informativo",
  };

  return (
    <>
      {perf.alerts.map((alert) => (
        <ReportSection
          key={alert.id}
          id={`report-lav-alert-${alert.id}`}
          title={alert.title}
          subtitle={severitySubtitle[alert.severity]}
          defaultCollapsed
        >
          <KpiPerformanceAlertCard alert={alert} />
        </ReportSection>
      ))}
    </>
  );
}

/** @deprecated Usare sezione REPORT `lavorazioni` — mantenuto per zone legacy. */
export function ReportExecutiveOverview({ compareMode }: { compareMode: ReportCompareMode }) {
  return (
    <ShellCard
      id="report-executive"
      title="Panoramica esecutiva"
      subtitle="Stato officina e flotta nel periodo selezionato"
      collapsible={false}
      className={reportZoneShellClass}
    >
      <ReportExecutiveSummaryContent compareMode={compareMode} />
      <ReportExecutiveAlertSections />
    </ShellCard>
  );
}
