"use client";

import { ReportExecutiveOverviewContent } from "@/components/report/layout/report-executive-overview";
import { useReportPerformanceContext } from "@/components/report/layout/report-performance-context";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import {
  ReportNarrativeBlock,
  ReportSection,
  ReportExecutiveKpiSection,
  REPORT_PANORAMICA_DENSITY,
  ReportDensityProvider,
} from "@/components/report/design-system";

export default function ReportPanoramicaSectionView(props: DomainReportSectionProps) {
  const { partitioned } = useReportPerformanceContext();

  return (
    <ReportDensityProvider density={REPORT_PANORAMICA_DENSITY}>
      <div className="min-w-0 space-y-4">
        <ReportSection
          id="report-panoramica-kpi"
          title="Indicatori chiave"
          subtitle="KPI esecutivi con confronto periodo"
        >
          <ReportExecutiveKpiSection items={partitioned.executive} compareMode={props.analyticsContext.compareMode} />
        </ReportSection>
        <ReportNarrativeBlock variant="summary" title="Sintesi esecutiva">
          <ReportExecutiveOverviewContent compareMode={props.analyticsContext.compareMode} />
        </ReportNarrativeBlock>
      </div>
    </ReportDensityProvider>
  );
}
