"use client";

import { useMemo } from "react";
import { useReportAnalyticsDerived } from "@/components/report/report-analytics-derived-context";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import { ReportDomainMetricsGrid, ReportSection } from "@/components/report/design-system";
import { computeCrossDerived } from "@/lib/report/report-derived-engine";
import type { ReportDomainMetric } from "@/lib/report/report-domain-types";

function pickMetrics(metrics: readonly ReportDomainMetric[], ids: readonly string[]) {
  const set = new Set(ids);
  return metrics.filter((m) => set.has(m.id));
}

export default function ReportCrossSectionView(props: DomainReportSectionProps) {
  const derived = useReportAnalyticsDerived();

  const crossDto = useMemo(
    () => computeCrossDerived(derived),
    [derived.revision, derived.operational, derived.warehouse, derived.labor, derived.economic],
  );

  const efficiency = pickMetrics(crossDto.metrics, ["cross_efficiency"]);
  const pressure = pickMetrics(crossDto.metrics, ["cross_parts_job", "cross_cost_job"]);
  const economy = pickMetrics(crossDto.metrics, ["cross_value_hour"]);

  return (
    <div className="min-w-0 space-y-4">
      <ReportSection id="report-cross-efficiency" title="Efficienza" subtitle="Produttività officina nel periodo">
        <ReportDomainMetricsGrid metrics={efficiency} compareMode={props.analyticsContext.compareMode} />
      </ReportSection>
      <ReportSection
        id="report-cross-pressure"
        title="Pressione operativa"
        subtitle="Ricambi e costo medio per intervento"
        defaultCollapsed
      >
        <ReportDomainMetricsGrid metrics={pressure} compareMode={props.analyticsContext.compareMode} />
      </ReportSection>
      <ReportSection
        id="report-cross-economy"
        title="Economia"
        subtitle="Valore generato per ora lavorata"
        defaultCollapsed
      >
        <ReportDomainMetricsGrid metrics={economy} compareMode={props.analyticsContext.compareMode} />
      </ReportSection>
    </div>
  );
}
