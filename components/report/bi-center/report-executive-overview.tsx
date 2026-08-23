"use client";

import { ReportV2ExecutiveBoundary } from "@/components/report/executive/ReportV2ExecutiveBoundary";
import { useRegisterAnalyticsSection } from "@/components/report/analytics/report-analytics-provider";
import { ReportAnalysisSectionShell } from "@/components/report/bi-center/report-analysis-section-shell";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { getReportSectionCopy } from "@/lib/report/ui/report-business-labels";

export function ReportExecutiveOverviewContent() {
  const { range, compareMode } = useReportPeriodContext();
  useRegisterAnalyticsSection("executive-enrichment", "executiveEnrichment");
  return <ReportV2ExecutiveBoundary range={range} compareMode={compareMode} embedded />;
}

export function ReportExecutiveOverview() {
  const executiveCopy = getReportSectionCopy("executive");
  return (
    <ReportAnalysisSectionShell
      title={executiveCopy.title}
      subtitle={executiveCopy.subtitle}
      persistKey="bi-executive"
    >
      <ReportExecutiveOverviewContent />
    </ReportAnalysisSectionShell>
  );
}
