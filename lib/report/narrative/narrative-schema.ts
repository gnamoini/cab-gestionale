import { z } from "zod";
import { TRUST_STATUSES } from "@/lib/report/contracts/metadata-envelope";
import { NARRATIVE_PROVIDER_IDS } from "@/lib/report/narrative/types";
import {
  GENERATED_NARRATIVE_CONTRACT_VERSION,
  NARRATIVE_PROMPT_CONTEXT_VERSION,
} from "@/lib/report/narrative/types";

const insightSeveritySchema = z.enum(["info", "warning", "critical"]);

const aiInsightPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

export const narrativePromptSignalSchema = z.object({
  ruleKey: z.string().min(1),
  ruleVersion: z.number().int().positive(),
  severity: insightSeveritySchema,
  trust: z.enum(TRUST_STATUSES),
  metricIds: z.array(z.string().min(1)),
  payload: aiInsightPayloadSchema,
});

export const narrativePromptContextSchema = z.object({
  contractVersion: z.literal(NARRATIVE_PROMPT_CONTEXT_VERSION),
  period: z
    .object({
      preset: z.string(),
      start: z.string(),
      end: z.string(),
      compareMode: z.string(),
    })
    .optional(),
  trustSummary: z.enum(TRUST_STATUSES),
  signals: z.array(narrativePromptSignalSchema),
  sourceContextVersion: z.literal("1"),
});

export const generatedNarrativeSectionSchema = z.object({
  ruleKey: z.string().min(1),
  metricIds: z.array(z.string().min(1)),
  explanation: z.string().min(1).max(2000),
  sourceTrust: z.enum(TRUST_STATUSES).optional(),
});

export const generatedNarrativeDtoSchema = z.object({
  contractVersion: z.literal(GENERATED_NARRATIVE_CONTRACT_VERSION),
  sections: z.array(generatedNarrativeSectionSchema),
  disclaimer: z.string().min(1).max(500).optional(),
  generatedAt: z.string().datetime(),
  modelMetadata: z
    .object({
      provider: z.enum(NARRATIVE_PROVIDER_IDS),
      model: z.string().min(1),
      latencyMs: z.number().int().nonnegative().optional(),
    })
    .optional(),
});
