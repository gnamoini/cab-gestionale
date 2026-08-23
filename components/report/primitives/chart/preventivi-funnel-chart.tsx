"use client";

import { ReportTemporalMonthlyBars } from "@/components/report/report-charts";
import { ReportVisualization } from "@/components/report/design-system/layout/visualization";
import type { PreventiviFunnelRow } from "@/lib/report/economic-analytics-extended";

export function ReportPreventiviFunnelChart({
  rows,
  title = "Preventivi per esito",
}: {
  rows: readonly PreventiviFunnelRow[];
  title?: string;
}) {
  if (rows.length === 0) {
    return (
      <ReportVisualization title={title}>
        <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun preventivo nel periodo.</p>
      </ReportVisualization>
    );
  }
  return (
    <ReportVisualization title={title}>
      <ReportTemporalMonthlyBars rows={rows.map((r) => ({ label: r.label, count: r.count }))} />
      <p className="mt-2 text-[10px] text-[color:var(--cab-text-muted)]">
        Valore totale:{" "}
        {rows.reduce((s, r) => s + r.value, 0).toLocaleString("it-IT", {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0,
        })}
      </p>
    </ReportVisualization>
  );
}
