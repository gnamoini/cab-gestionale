"use client";

import dynamic from "next/dynamic";
import { ReportAskPanel } from "@/components/report/ask-report/report-ask-panel";
import { ReportLayoutDetail, ReportStorySection } from "@/components/report/design-system";
import { useReportAsk } from "@/components/report/ask-report/report-ask-provider";
import { getReportStoryCopy } from "@/lib/report/ui/report-copy";

const BusinessReportShell = dynamic(() =>
  import("@/components/report/business-report/business-report-shell").then((m) => m.BusinessReportShell),
);
const ReportDecisionCenter = dynamic(() =>
  import("@/components/report/decision-center/report-decision-center").then((m) => m.ReportDecisionCenter),
);

function ReportAskAreaSection() {
  const { setOpen } = useReportAsk();
  const copy = getReportStoryCopy("ai-ask");
  return (
    <ReportStorySection title={copy.title} subtitle={copy.subtitle} testId="report-story-ai-ask">
      <p className="text-sm text-[color:var(--cab-text-muted)]">
        Usa il pannello per fare domande su metriche, eventi e decisioni del periodo selezionato.
      </p>
      <button
        type="button"
        className="mt-3 rounded-md bg-[color:var(--cab-accent)] px-4 py-2 text-sm font-medium text-white"
        onClick={() => setOpen(true)}
        data-testid="report-ask-open"
      >
        Apri Chiedi al Report
      </button>
      <ReportAskPanel />
    </ReportStorySection>
  );
}

export function ReportAreaAiView() {
  const reportCopy = getReportStoryCopy("ai-report");
  const decisionsCopy = getReportStoryCopy("ai-decisions");

  return (
    <div className="min-w-0" data-testid="report-area-ai">
      <ReportStorySection
        title={reportCopy.title}
        subtitle={reportCopy.subtitle}
        testId="report-story-ai-report"
        showDivider={false}
      >
        <ReportLayoutDetail>
          <BusinessReportShell />
        </ReportLayoutDetail>
      </ReportStorySection>
      <ReportAskAreaSection />
      <ReportStorySection
        title={decisionsCopy.title}
        subtitle={decisionsCopy.subtitle}
        testId="report-story-ai-decisions"
      >
        <ReportDecisionCenter />
      </ReportStorySection>
    </div>
  );
}
