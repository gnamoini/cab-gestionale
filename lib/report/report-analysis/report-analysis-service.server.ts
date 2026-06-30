import "server-only";

import { geminiReportAnalysisProvider } from "@/lib/ai/report-analysis";
import type { GenerateReportAnalysisResult } from "@/lib/ai/llm-provider.types";
import type { ReportAnalysisContext } from "@/lib/report/report-analysis/report-analysis-schema";

/** Servizio server per generazione analisi report via LLM. */
export const AIReportService = {
  isConfigured(): boolean {
    return geminiReportAnalysisProvider.isConfigured();
  },

  async generateReportAnalysis(context: ReportAnalysisContext): Promise<GenerateReportAnalysisResult> {
    return geminiReportAnalysisProvider.generate(context);
  },
};
