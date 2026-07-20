import {
  AI_CONTEXT_CONTRACT_VERSION,
  type AIInsightSignal,
  type ReportAIContextDto,
} from "@/lib/report/ai-context/types";
import {
  NARRATIVE_PROMPT_CONTEXT_VERSION,
  type NarrativePromptContext,
  type NarrativePromptSignal,
} from "@/lib/report/narrative/types";

function toNarrativePromptSignal(signal: AIInsightSignal): NarrativePromptSignal {
  return {
    ruleKey: signal.ruleKey,
    ruleVersion: signal.ruleVersion,
    severity: signal.severity,
    trust: signal.trust,
    metricIds: [...signal.metricIds],
    payload: {
      schemaVersion: signal.payload.schemaVersion,
      values: { ...signal.payload.values },
    },
  };
}

/** Lossless projection v1: projection ≠ semantic transformation. */
export function buildNarrativePromptContext(input: ReportAIContextDto): NarrativePromptContext {
  return {
    contractVersion: NARRATIVE_PROMPT_CONTEXT_VERSION,
    period: input.period,
    trustSummary: input.trustSummary,
    signals: input.insights.map(toNarrativePromptSignal),
    operationalDiary: input.operationalDiary,
    sourceContextVersion: AI_CONTEXT_CONTRACT_VERSION,
  };
}
