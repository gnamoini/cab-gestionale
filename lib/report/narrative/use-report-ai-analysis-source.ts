"use client";

import {
  resolveOperationalBriefEnabledClient,
  resolveReportV2NarrativeEnabledClient,
} from "@/lib/feature-flags/report-v2-flag";
import { useOperationalBrief } from "@/lib/operational-intelligence/use-operational-brief";
import { useReportNarrative } from "@/lib/report/narrative/use-report-narrative";
import { useReportAnalysis } from "@/lib/report/report-analysis/use-report-analysis";
import type { OperationalBriefOutput } from "@/lib/operational-intelligence/types";
import type { GeneratedNarrativeDto } from "@/lib/report/narrative/types";
import type { ReportAnalysisOutput } from "@/lib/report/report-analysis/report-analysis-schema";
import type { UseReportAnalysisInput } from "@/lib/report/report-analysis/use-report-analysis";

export type ReportAiAnalysisSource =
  | {
      type: "operational-brief";
      data: OperationalBriefOutput | null;
      correlationId: string | null;
      loading: boolean;
      error: string | null;
      refetch: () => void;
    }
  | {
      type: "narrative-v2";
      data: GeneratedNarrativeDto | null;
      correlationId: string | null;
      loading: boolean;
      error: string | null;
      refetch: () => void;
    }
  | {
      type: "legacy";
      data: ReportAnalysisOutput | null;
      loading: boolean;
      error: string | null;
      refetch: () => void;
      legacy: ReturnType<typeof useReportAnalysis>;
    };

/** Sole owner of AI analysis source flags for report UI. */
export function useReportAiAnalysisSource(input: UseReportAnalysisInput): ReportAiAnalysisSource {
  const briefEnabled = resolveOperationalBriefEnabledClient();
  const narrativeEnabled = resolveReportV2NarrativeEnabledClient();
  const legacy = useReportAnalysis(input);

  const brief = useOperationalBrief({
    preset: input.preset,
    compareMode: input.compareMode,
    filterRange: input.filterRange,
    enabled: briefEnabled,
  });

  const narrative = useReportNarrative({
    preset: input.preset,
    compareMode: input.compareMode,
    filterRange: input.filterRange,
    enabled: !briefEnabled && narrativeEnabled,
  });

  if (briefEnabled) {
    return {
      type: "operational-brief",
      data: brief.data,
      correlationId: brief.correlationId,
      loading: brief.loading,
      error: brief.error,
      refetch: brief.refetch,
    };
  }

  if (narrativeEnabled) {
    return {
      type: "narrative-v2",
      data: narrative.data,
      correlationId: narrative.correlationId,
      loading: narrative.loading,
      error: narrative.error,
      refetch: narrative.refetch,
    };
  }

  return {
    type: "legacy",
    data: legacy.data,
    loading: legacy.isLoading,
    error: legacy.error?.message ?? null,
    refetch: () => void legacy.generate(),
    legacy,
  };
}
