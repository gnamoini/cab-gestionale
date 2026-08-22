"use client";

import { ReportV2ExecutiveBoundary } from "@/components/report/executive/ReportV2ExecutiveBoundary";
import { useRegisterAnalyticsSection } from "@/components/report/analytics/report-analytics-provider";
import { ReportAnalysisSectionShell } from "@/components/report/bi-center/report-analysis-section-shell";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { getReportSectionCopy } from "@/lib/report/ui/report-business-labels";

export function ReportExecutiveOverview() {
  const { range, compareMode } = useReportPeriodContext();
  const executiveCopy = getReportSectionCopy("executive");
  useRegisterAnalyticsSection("executive-enrichment", "executiveEnrichment");

  return (
    <ReportAnalysisSectionShell
      title={executiveCopy.title}
      subtitle={executiveCopy.subtitle}
      persistKey="bi-executive"
    >
      <ReportV2ExecutiveBoundary range={range} compareMode={compareMode} embedded />
    </ReportAnalysisSectionShell>
  );
}
