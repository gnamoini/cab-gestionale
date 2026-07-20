"use client";

import { ReportTemporalMonthlyBars } from "@/components/report/report-charts";
import { ReportVisualization } from "@/components/report/design-system/layout/visualization";
import type { WipFunnelRow } from "@/lib/report/lavorazioni-work-orders";

export function ReportLavorazioniFunnelChart({
  rows,
  title = "WIP per stato",
}: {
  rows: readonly WipFunnelRow[];
  title?: string;
}) {
  if (rows.length === 0) {
    return (
      <ReportVisualization title={title}>
        <p className="text-sm text-[color:var(--cab-text-muted)]">Nessuna lavorazione aperta.</p>
      </ReportVisualization>
    );
  }
  return (
    <ReportVisualization title={title}>
      <ReportTemporalMonthlyBars rows={rows.map((r) => ({ label: r.label, count: r.count }))} />
    </ReportVisualization>
  );
}
