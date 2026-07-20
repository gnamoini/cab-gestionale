import "server-only";

import { aiService } from "@/lib/ai/runtime/service";
import { aiErrorMessage, classifyAiError } from "@/lib/ai/runtime/errors";
import { readRuntimeModelForProvider, readRuntimeTimeoutMs } from "@/lib/ai/runtime/env-reader";
import {
  buildOperationalBriefInput,
  hashOperationalBriefInput,
  type OperationalBriefInput,
} from "@/lib/operational-intelligence/brief/build-operational-brief-input";
import {
  operationalBriefLlmContentSchema,
  type OperationalBriefLlmContent,
} from "@/lib/operational-intelligence/brief/operational-brief-schema";
import {
  OPERATIONAL_BRIEF_PROMPT_VERSION,
  OPERATIONAL_BRIEF_SYSTEM_PROMPT,
} from "@/lib/operational-intelligence/brief/operational-brief-prompt";
import type { OperationalBriefOutput } from "@/lib/operational-intelligence/types";

export type GenerateOperationalBriefResult =
  | { ok: true; data: OperationalBriefOutput }
  | { ok: false; code: string; message: string };

function mergeBriefOutput(
  input: OperationalBriefInput,
  llm: OperationalBriefLlmContent,
  model: string,
): OperationalBriefOutput {
  const inputHash = hashOperationalBriefInput(input);
  const now = new Date().toISOString();

  const emptyDomain = { summary: "", trend: "flat" as const, confidence: "medium" as const, evidence: [] };

  return {
    contractVersion: "1",
    period: { ...input.period, status: "brief_generated", generatedAt: now },
    briefScore: input.briefScore,
    executiveSummary: {
      ...llm.executiveSummary,
      evidence: input.events.slice(0, 3).flatMap((e) => e.evidence),
    },
    todayPriorities: llm.todayPriorities.map((p) => ({ ...p, evidence: p.evidence ?? [] })),
    topProblems: llm.topProblems.map((p) => ({ ...p, evidence: p.evidence ?? [] })),
    wins: llm.wins.map((p) => ({ ...p, evidence: p.evidence ?? [] })),
    events: input.events,
    recommendedActions: llm.recommendedActions.map((a) => ({
      ...a,
      suggestedBy: now.slice(0, 10),
      evidence: [],
    })),
    domainAnalysis: {
      production: { ...emptyDomain, summary: llm.domainAnalysis.production.summary, trend: llm.domainAnalysis.production.trend },
      fleet: { ...emptyDomain, summary: llm.domainAnalysis.fleet.summary, trend: llm.domainAnalysis.fleet.trend },
      warehouse: { ...emptyDomain, summary: llm.domainAnalysis.warehouse.summary, trend: llm.domainAnalysis.warehouse.trend },
      staff: { ...emptyDomain, summary: llm.domainAnalysis.staff.summary, trend: llm.domainAnalysis.staff.trend },
      costs: { ...emptyDomain, summary: llm.domainAnalysis.costs.summary, trend: llm.domainAnalysis.costs.trend },
    },
    qualitativeContextUsed: input.diary.slice(0, 10),
    disclaimer:
      llm.disclaimer ??
      "Brief operativo generativo basato su dati certi del periodo — verificare sempre prima di decisioni operative.",
    generatedAt: now,
    modelMetadata: {
      model,
      promptVersion: OPERATIONAL_BRIEF_PROMPT_VERSION,
      inputHash,
    },
  };
}

export async function generateOperationalBrief(
  rawInput: Omit<Parameters<typeof buildOperationalBriefInput>[0], never>,
  signal?: AbortSignal,
): Promise<GenerateOperationalBriefResult> {
  const input = buildOperationalBriefInput(rawInput);

  if (signal?.aborted) {
    return { ok: false, code: "timeout", message: aiErrorMessage("AI_TIMEOUT") };
  }

  const status = await aiService.getConfigurationStatus();
  if (!status.configured) {
    return { ok: false, code: "not_configured", message: aiErrorMessage("AI_CONFIG_MISSING") };
  }

  const timeoutMs = Math.min(readRuntimeTimeoutMs(), 45_000);
  const model = readRuntimeModelForProvider("google");

  const result = await aiService.generateObject<OperationalBriefLlmContent>({
    schema: operationalBriefLlmContentSchema,
    system: OPERATIONAL_BRIEF_SYSTEM_PROMPT,
    prompt: JSON.stringify(input),
    temperature: 0.25,
    operation: "operational_brief",
    provider: "google",
    timeoutMs,
  });

  if (!result.ok) {
    const code = classifyAiError(new Error(result.message));
    if (code === "AI_TIMEOUT") {
      return { ok: false, code: "timeout", message: aiErrorMessage("AI_TIMEOUT") };
    }
    return { ok: false, code: "generation_failed", message: result.message };
  }

  return {
    ok: true,
    data: mergeBriefOutput(input, result.data.object, result.meta.modelId ?? model),
  };
}

export { buildOperationalBriefInput };
