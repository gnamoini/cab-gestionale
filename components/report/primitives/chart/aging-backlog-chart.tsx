"use client";

import { ReportTemporalMonthlyBars } from "@/components/report/report-charts";
import { ReportVisualization } from "@/components/report/design-system/layout/visualization";

export function ReportAgingBacklogChart({
  points,
  title = "Aging backlog aperte",
}: {
  points: readonly { label: string; value: number }[];
  title?: string;
}) {
  const total = points.reduce((s, p) => s + p.value, 0);
  if (total === 0) {
    return (
      <ReportVisualization title={title}>
        <p className="text-sm text-[color:var(--cab-text-muted)]">Nessuna lavorazione aperta.</p>
      </ReportVisualization>
    );
  }

  return (
    <ReportVisualization title={title}>
      <ReportTemporalMonthlyBars
        rows={points.map((p) => ({ label: p.label, count: p.value }))}
      />
    </ReportVisualization>
  );
}
