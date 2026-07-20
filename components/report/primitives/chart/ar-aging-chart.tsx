"use client";

import { ReportTemporalMonthlyBars } from "@/components/report/report-charts";
import { ReportVisualization } from "@/components/report/design-system/layout/visualization";
import type { ArAgingPoint } from "@/lib/report/economic-credit-analytics";

export function ReportArAgingChart({
  points,
  title = "AR aging crediti",
}: {
  points: readonly ArAgingPoint[];
  title?: string;
}) {
  const total = points.reduce((s, p) => s + p.value, 0);
  if (total <= 0) {
    return (
      <ReportVisualization title={title}>
        <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun credito aperto.</p>
      </ReportVisualization>
    );
  }

  const rows = points.map((p) => ({
    label: `${p.label} (${Math.round((p.value / total) * 100)}%)`,
    count: p.value,
  }));

  return (
    <ReportVisualization title={title}>
      <ReportTemporalMonthlyBars rows={rows} />
      <p className="mt-2 text-[10px] text-[color:var(--cab-text-muted)]">
        Totale crediti:{" "}
        {total.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
      </p>
    </ReportVisualization>
  );
}
