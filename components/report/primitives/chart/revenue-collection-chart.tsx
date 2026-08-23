"use client";

import { useMemo } from "react";
import { ReportMultiSeriesLineChart } from "@/components/report/design-system/primitives/chart/multi-series-line-chart";
import { ReportVisualization } from "@/components/report/design-system/layout/visualization";
import type { RevenueMonthPoint } from "@/lib/report/economic-analytics-extended";

import { reportChartSeriesColor } from "@/lib/report/ui/report-chart-theme";

export function ReportRevenueCollectionChart({
  current,
  compare,
  title = "Fatturato vs incassato",
}: {
  current: readonly RevenueMonthPoint[];
  compare?: readonly RevenueMonthPoint[] | null;
  title?: string;
}) {
  const series = useMemo(() => {
    const out = [
      {
        id: "fatturato",
        label: "Fatturato",
        color: reportChartSeriesColor("secondary"),
        unit: "currency" as const,
        points: current.map((p) => ({
          date: p.monthKey,
          displayValue: p.fatturato,
          realValue: p.fatturato,
        })),
      },
      {
        id: "incassato",
        label: "Incassato",
        color: reportChartSeriesColor("accent"),
        unit: "currency" as const,
        points: current.map((p) => ({
          date: p.monthKey,
          displayValue: p.incassato,
          realValue: p.incassato,
        })),
      },
    ];
    if (compare && compare.length > 0) {
      out.push({
        id: "fatturato_prev",
        label: "Fatturato (confronto)",
        color: reportChartSeriesColor("muted"),
        unit: "currency" as const,
        points: compare.map((p) => ({
          date: p.monthKey,
          displayValue: p.fatturato,
          realValue: p.fatturato,
        })),
      });
    }
    return out;
  }, [current, compare]);

  if (current.length === 0) {
    return (
      <ReportVisualization title={title}>
        <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun dato nel periodo.</p>
      </ReportVisualization>
    );
  }

  return (
    <ReportVisualization title={title}>
      <ReportMultiSeriesLineChart series={series} displayMode="absolute" />
    </ReportVisualization>
  );
}
