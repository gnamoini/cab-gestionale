"use client";

import { ReportBklitDonut } from "@/components/report/bklit/report-bklit-charts";
import { ReportVisualization } from "@/components/report/design-system/layout/visualization";
import type { RevenueMixSlice } from "@/lib/report/economic-analytics-extended";
import { reportBklitSeriesColor } from "@/lib/report/ui/bklit-adapters";

export function ReportRevenueMixDonut({
  slices,
  title = "Mix ricavi",
}: {
  slices: readonly RevenueMixSlice[];
  title?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0) {
    return (
      <ReportVisualization title={title}>
        <p className="text-sm text-[color:var(--cab-text-muted)]">Nessuna riga fattura nel periodo.</p>
      </ReportVisualization>
    );
  }

  const pieSlices = slices.map((slice, i) => ({
    label: slice.label,
    value: slice.value,
    color: reportBklitSeriesColor(i),
  }));

  return (
    <ReportVisualization title={title}>
      <ReportBklitDonut slices={pieSlices} centerLabel="Mix" ariaLabel={title} />
    </ReportVisualization>
  );
}
