"use client";

import { ReportBklitAgingStacked } from "@/components/report/bklit/report-bklit-charts";
import { ReportVisualization } from "@/components/report/design-system/layout/visualization";
import type { AgingStackedSeries } from "@/lib/report/lavorazioni-work-orders";

export function ReportAgingBacklogStackedChart({
  series,
  title = "Aging backlog per stato",
}: {
  series: readonly AgingStackedSeries[];
  title?: string;
}) {
  const total = series.reduce(
    (s, row) => s + row.values["0-7"] + row.values["8-14"] + row.values["15-30"] + row.values["30+"],
    0,
  );
  if (total === 0) {
    return (
      <ReportVisualization title={title}>
        <p className="text-sm text-[color:var(--cab-text-muted)]">Nessuna lavorazione aperta.</p>
      </ReportVisualization>
    );
  }

  const rows = series.map((row) => ({
    label: row.label,
    values: row.values,
  }));

  return (
    <ReportVisualization title={title}>
      <ReportBklitAgingStacked series={rows} ariaLabel={title} />
    </ReportVisualization>
  );
}
