"use client";

import dynamic from "next/dynamic";
import type { ReportCompareMode, DateRange } from "@/lib/report/date-ranges";
import { ReportV2InsightBoundary } from "@/components/report/insight-strip/ReportV2InsightBoundary";
import { ReportExecutiveOverview } from "@/components/report/bi-center/report-executive-overview";
import {
  ReportSectionNav,
  ReportSectionNavMobile,
} from "@/components/report/bi-center/advanced/report-section-nav";

const ReportPrimaryTrendSection = dynamic(() =>
  import("@/components/report/bi-center/report-primary-trend-section").then((m) => m.ReportPrimaryTrendSection),
);
const ReportOperationalContextPanel = dynamic(() =>
  import("@/components/report/bi-center/operational/report-operational-context-panel").then(
    (m) => m.ReportOperationalContextPanel,
  ),
);
const ReportAdvancedAnalysisShell = dynamic(() =>
  import("@/components/report/bi-center/report-advanced-analysis-shell").then((m) => m.ReportAdvancedAnalysisShell),
);
const ReportDecisionCenter = dynamic(() =>
  import("@/components/report/decision-center/report-decision-center").then((m) => m.ReportDecisionCenter),
);
const ReportHistoricalTrendSection = dynamic(() =>
  import("@/components/report/bi-center/report-historical-trend-section").then((m) => m.ReportHistoricalTrendSection),
);
const ReportTimelineV2 = dynamic(() =>
  import("@/components/report/bi-center/operational/report-timeline-v2").then((m) => m.ReportTimelineV2),
);
const BusinessReportShell = dynamic(() =>
  import("@/components/report/business-report/business-report-shell").then((m) => m.BusinessReportShell),
);
const ReportAskSection = dynamic(() =>
  import("@/components/report/ask-report/report-ask-section").then((m) => m.ReportAskSection),
);

/** P7 mount — Executive → Trend → Insight → Context → Advanced → Decisioni → Historical → Timeline → Business Report */
export function ReportBiCenterMount({
  filterRange,
  compareMode,
}: {
  filterRange: DateRange;
  compareMode: ReportCompareMode;
}) {
  return (
    <div className="min-w-0 space-y-4" data-testid="report-bi-center">
      <ReportSectionNavMobile />
      <ReportSectionNav />
      <div id="bi-executive">
        <ReportExecutiveOverview />
      </div>
      <div id="bi-trend">
        <ReportPrimaryTrendSection />
      </div>
      <div id="bi-insight">
        <ReportV2InsightBoundary range={filterRange} compareMode={compareMode} />
      </div>
      <div id="bi-context">
        <ReportOperationalContextPanel />
      </div>
      <ReportAdvancedAnalysisShell />
      <ReportDecisionCenter />
      <div id="bi-historical">
        <ReportHistoricalTrendSection />
      </div>
      <div id="bi-timeline">
        <ReportTimelineV2 />
      </div>
      <div id="bi-business-report">
        <BusinessReportShell />
      </div>
      <ReportAskSection />
    </div>
  );
}
