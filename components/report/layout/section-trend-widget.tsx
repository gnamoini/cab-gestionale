"use client";

import { ReportBarChart } from "@/components/report/design-system";
import { ReportVisualization } from "@/components/report/design-system/layout/visualization";

export function ReportSectionTrendWidget({
  title,
  points,
  unitLabel,
}: {
  title: string;
  points: readonly { label: string; value: number }[];
  unitLabel?: string;
}) {
  if (points.length === 0) {
    return (
      <ReportVisualization title={title}>
        <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun dato nel periodo.</p>
      </ReportVisualization>
    );
  }

  return (
    <ReportVisualization title={title}>
      <ReportBarChart points={[...points]} />
    </ReportVisualization>
  );
}
