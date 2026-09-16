"use client";

import { memo } from "react";
import { ReportBklitParetoCombo } from "@/components/report/bklit/report-bklit-charts";
import type { MagazzinoParetoRow } from "@/lib/report/magazzino-analytics";

function MagazzinoParetoChartInner({ rows }: { rows: MagazzinoParetoRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun consumo nel periodo.</p>;
  }

  const data = rows.map((r) => ({
    name: r.codice,
    uscite: r.uscite,
    cumPct: r.cumPct,
  }));

  return <ReportBklitParetoCombo rows={data} barKey="uscite" lineKey="cumPct" ariaLabel="Pareto consumi ricambi" />;
}

export const MagazzinoParetoChart = memo(MagazzinoParetoChartInner);
