"use client";

import { ReportOperationalContextEvents } from "@/components/report/bi-center/operational/report-operational-context-panel";
import { ReportOperationalTimelineContent } from "@/components/report/bi-center/operational/report-timeline-v2";
import { ReportLayoutDetail, ReportStorySection } from "@/components/report/design-system";
import { getReportStoryCopy } from "@/lib/report/ui/report-copy";

export function ReportAreaContestoView() {
  const eventi = getReportStoryCopy("contesto-eventi");
  const timeline = getReportStoryCopy("contesto-timeline");

  return (
    <div className="min-w-0" data-testid="report-area-contesto">
      <ReportStorySection
        title={eventi.title}
        subtitle={eventi.subtitle}
        testId="report-story-contesto-eventi"
        showDivider={false}
      >
        <ReportLayoutDetail>
          <ReportOperationalContextEvents />
        </ReportLayoutDetail>
      </ReportStorySection>

      <ReportStorySection title={timeline.title} subtitle={timeline.subtitle} testId="report-story-contesto-timeline">
        <ReportLayoutDetail>
          <ReportOperationalTimelineContent />
        </ReportLayoutDetail>
      </ReportStorySection>
    </div>
  );
}
