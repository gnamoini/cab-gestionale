"use client";

import { ReportMultiSeriesLineChart } from "@/components/report/design-system/primitives/chart/multi-series-line-chart";
import { ReportVisualization } from "@/components/report/design-system/layout/visualization";
import type { IngressiChiusurePoint } from "@/lib/report/lavorazioni-work-orders";

export function ReportIngressiChiusureChart({
  points,
  title = "Ingressi vs chiusure e accumulo",
}: {
  points: readonly IngressiChiusurePoint[];
  title?: string;
}) {
  if (points.length === 0) {
    return (
      <ReportVisualization title={title}>
        <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun dato nel periodo.</p>
      </ReportVisualization>
    );
  }

  const series = [
    {
      id: "ingressi",
      label: "Ingressi",
      color: "#0ea5e9",
      unit: "count" as const,
      points: points.map((p) => ({
        date: p.monthKey,
        displayValue: p.ingressi,
        realValue: p.ingressi,
      })),
    },
    {
      id: "chiusure",
      label: "Chiusure",
      color: "#f97316",
      unit: "count" as const,
      points: points.map((p) => ({
        date: p.monthKey,
        displayValue: p.chiusure,
        realValue: p.chiusure,
      })),
    },
    {
      id: "saldo",
      label: "Accumulo cumulativo",
      color: "#22c55e",
      unit: "count" as const,
      axis: "right" as const,
      points: points.map((p) => ({
        date: p.monthKey,
        displayValue: p.saldoCumulativo,
        realValue: p.saldoCumulativo,
      })),
    },
  ];

  return (
    <ReportVisualization title={title}>
      <ReportMultiSeriesLineChart series={series} displayMode="dual-axis" />
      <p className="mt-2 text-[10px] leading-snug text-[color:var(--cab-text-muted)]">
        L&apos;accumulo cumulativo è la somma progressiva (ingressi − chiusure) nel periodo filtrato.
      </p>
    </ReportVisualization>
  );
}
