"use client";

import { memo } from "react";
import { ReportBklitParetoCombo } from "@/components/report/bklit/report-bklit-charts";
import { reportChartShellClass } from "@/components/report/report-ui-tokens";
import type { ParetoClientePoint } from "@/lib/report/kpi-performance/fleet-report-helpers";

function ClientiParetoChartInner({
  points,
  ariaLabel = "Pareto clienti per interventi",
}: {
  points: readonly ParetoClientePoint[];
  ariaLabel?: string;
}) {
  if (points.length === 0) {
    return <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun intervento nel periodo.</p>;
  }

  const rows = points.map((p) => ({
    name: p.cliente.length > 12 ? `${p.cliente.slice(0, 11)}…` : p.cliente,
    interventi: p.interventi,
    cumulPct: p.cumulPct,
  }));

  return (
    <div className={reportChartShellClass}>
      <ReportBklitParetoCombo rows={rows} barKey="interventi" lineKey="cumulPct" ariaLabel={ariaLabel} />
      <p className="mt-1 text-[10px] text-[color:var(--cab-text-muted)]">Barre: interventi · Linea: cumulata %</p>
    </div>
  );
}

export const ClientiParetoChart = memo(ClientiParetoChartInner);
