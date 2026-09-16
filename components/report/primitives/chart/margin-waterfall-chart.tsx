"use client";

import { ReportBklitWaterfallSteps } from "@/components/report/bklit/report-bklit-charts";
import { ReportVisualization } from "@/components/report/design-system/layout/visualization";
import type { MarginWaterfallStep } from "@/lib/report/economic-analytics-extended";

export function ReportMarginWaterfallChart({
  steps,
  title = "Waterfall margine operativo",
}: {
  steps: readonly MarginWaterfallStep[];
  title?: string;
}) {
  if (steps.length === 0) {
    return (
      <ReportVisualization title={title}>
        <p className="text-sm text-[color:var(--cab-text-muted)]">Dati costi non disponibili.</p>
      </ReportVisualization>
    );
  }

  return (
    <ReportVisualization title={title}>
      <ReportBklitWaterfallSteps steps={[...steps]} ariaLabel={title} />
    </ReportVisualization>
  );
}
