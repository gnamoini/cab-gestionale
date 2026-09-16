"use client";

import { memo } from "react";
import { ReportBklitCategoricalBar } from "@/components/report/bklit/report-bklit-charts";
import { reportChartShellClass } from "@/components/report/report-ui-tokens";
import type { ClienteDisponibilitaRow } from "@/lib/report/kpi-performance/kpi-performance-formulas";
import { FLEET_DISP_SOGLIA_PCT } from "@/lib/report/kpi-performance/fleet-report-helpers";
import { categoricalBarRows } from "@/lib/report/ui/bklit-adapters";

function DisponibilitaClienteBarChartInner({
  rows,
  limit = 10,
  ariaLabel = "Disponibilità per cliente",
}: {
  rows: readonly ClienteDisponibilitaRow[];
  limit?: number;
  ariaLabel?: string;
}) {
  const data = [...rows]
    .filter((r) => r.disponibilitaPct != null)
    .sort((a, b) => (a.disponibilitaPct ?? 0) - (b.disponibilitaPct ?? 0))
    .slice(0, limit)
    .map((r) => ({
      label: r.cliente.length > 16 ? `${r.cliente.slice(0, 15)}…` : r.cliente,
      value: r.disponibilitaPct ?? 0,
      muted: (r.disponibilitaPct ?? 0) < FLEET_DISP_SOGLIA_PCT,
    }));

  if (data.length === 0) {
    return <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun dato disponibilità.</p>;
  }

  return (
    <div className={reportChartShellClass}>
      <ReportBklitCategoricalBar rows={categoricalBarRows(data)} ariaLabel={ariaLabel} />
      <p className="mt-1 text-[10px] text-[color:var(--cab-text-muted)]">Soglia attenzione: {FLEET_DISP_SOGLIA_PCT}%</p>
    </div>
  );
}

export const DisponibilitaClienteBarChart = memo(DisponibilitaClienteBarChartInner);
