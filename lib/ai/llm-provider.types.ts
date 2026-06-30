import type { ReportAnalysisContext } from "@/lib/report/report-analysis/report-analysis-schema";
import type { ReportAnalysisOutput } from "@/lib/report/report-analysis/report-analysis-schema";

export type GenerateReportAnalysisResult =
  | { ok: true; data: ReportAnalysisOutput }
  | { ok: false; code: "not_configured" | "generation_failed" | "timeout"; message: string };

/** Contratto provider LLM — sostituibile senza toccare UI/hook. */
export type ReportAnalysisLlmProvider = {
  isConfigured(): boolean;
  generate(context: ReportAnalysisContext, signal?: AbortSignal): Promise<GenerateReportAnalysisResult>;
};
