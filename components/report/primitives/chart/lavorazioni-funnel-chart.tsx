"use client";

import { ReportBklitFunnel } from "@/components/report/bklit/report-bklit-charts";
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
      <ReportBklitFunnel stages={rows.map((r) => ({ label: r.label, value: r.count }))} />
    </ReportVisualization>
  );
}
