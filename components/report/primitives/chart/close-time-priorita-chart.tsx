"use client";

import { ReportBklitStackedEntrateUscite } from "@/components/report/bklit/report-bklit-charts";
import { ReportVisualization } from "@/components/report/design-system/layout/visualization";
import type { CloseTimeByPrioritaRow } from "@/lib/report/lavorazioni-work-orders";

export function ReportCloseTimePrioritaChart({
  rows,
  title = "Tempo chiusura per priorità",
}: {
  rows: readonly CloseTimeByPrioritaRow[];
  title?: string;
}) {
  if (rows.length === 0) {
    return (
      <ReportVisualization title={title}>
        <p className="text-sm text-[color:var(--cab-text-muted)]">Nessuna chiusura nel periodo.</p>
      </ReportVisualization>
    );
  }

  const chartRows = rows.map((r) => ({
    label: r.label,
    entrate: r.median,
    uscite: r.p90,
  }));

  return (
    <ReportVisualization title={title}>
      <ReportBklitStackedEntrateUscite rows={chartRows} mode="grouped" />
      <p className="mt-2 text-[10px] text-[color:var(--cab-text-muted)]">Barre: mediana (chart-2) · P90 (chart-1), in giorni</p>
    </ReportVisualization>
  );
}
