"use client";

import { ReportAiAnalysisZone } from "@/components/report/layout/report-ai-analysis-zone";
import type { ReportAiSectionProps } from "@/components/report/report-section-types";
import { ReportEmbeddedModule, ReportNarrativeBlock } from "@/components/report/design-system";

export default function ReportAiSection(props: ReportAiSectionProps) {
  return (
    <ReportNarrativeBlock variant="ai" title="Analisi assistita">
      <ReportEmbeddedModule label="Analisi IA">
        <ReportAiAnalysisZone {...props} embed />
      </ReportEmbeddedModule>
    </ReportNarrativeBlock>
  );
}
