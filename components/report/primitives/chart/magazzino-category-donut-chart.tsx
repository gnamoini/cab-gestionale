"use client";

import { memo, useMemo } from "react";
import { ReportBklitDonut } from "@/components/report/bklit/report-bklit-charts";
import type { MagazzinoCategoryStockSlice } from "@/lib/report/magazzino-analytics";
import { reportBklitSeriesColor } from "@/lib/report/ui/bklit-adapters";

function MagazzinoCategoryDonutChartInner({ slices }: { slices: MagazzinoCategoryStockSlice[] }) {
  const top = useMemo(() => slices.slice(0, 8), [slices]);

  if (top.length === 0) {
    return <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun dato di stock per categoria.</p>;
  }

  const pieSlices = top.map((s, i) => ({
    label: s.categoria,
    value: Math.max(1, s.valore),
    color: reportBklitSeriesColor(i),
  }));

  return <ReportBklitDonut slices={pieSlices} centerLabel="Stock" ariaLabel="Stock per categoria" />;
}

export const MagazzinoCategoryDonutChart = memo(MagazzinoCategoryDonutChartInner);
