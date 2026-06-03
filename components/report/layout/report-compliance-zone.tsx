"use client";

import { ShellCard } from "@/components/gestionale/shell-card";
import { KpiPerformanceCompliance } from "@/components/report/kpi-performance/kpi-performance-compliance";
import { reportZoneShellClass } from "@/components/report/report-ui-tokens";

export function ReportComplianceZone() {
  return (
    <ShellCard
      id="report-compliance"
      title="Scadenze e compliance"
      subtitle="Revisioni, assicurazioni e collaudi"
      collapsible
      defaultCollapsed
      className={reportZoneShellClass}
    >
      <KpiPerformanceCompliance />
    </ShellCard>
  );
}
