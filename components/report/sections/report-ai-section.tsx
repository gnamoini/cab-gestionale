"use client";

import { ReportAiAnalysisZone } from "@/components/report/layout/report-ai-analysis-zone";
import type { ReportAiSectionProps } from "@/components/report/report-section-types";

export default function ReportAiSection(props: ReportAiSectionProps) {
  return <ReportAiAnalysisZone {...props} />;
}
