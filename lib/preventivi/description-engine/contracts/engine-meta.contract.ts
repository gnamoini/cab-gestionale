import { z } from "zod";

export const descriptionSourceTypeSchema = z.enum([
  "tkb_procedure",
  "tkb_intervento",
  "tkb_ricambio_map",
  "legacy_enrichment",
  "legacy_heuristic",
  "legacy_similarity",
  "legacy_context",
  "suggestion_approved",
  "operator_rephrased",
]);

export const generatedDescriptionLineSchema = z.object({
  activityId: z.string().nullable(),
  text: z.string().min(1),
  sourceType: descriptionSourceTypeSchema,
  sourceId: z.string().min(1),
  confidence: z.number().min(0).max(1),
  isVerifiedTechnical: z.boolean(),
  sort: z.number().int(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const confidenceFactorsSchema = z.object({
  keywordMatch: z.number().min(0).max(1),
  componentMatch: z.number().min(0).max(1),
  symptomMatch: z.number().min(0).max(1),
  compatibility: z.number().min(0).max(1),
  legacyPenalty: z.number().min(0).max(1),
});

export const descriptionEngineMetaSchema = z.object({
  engineVersion: z.enum(["legacy_v1", "tde_v1"]),
  generationId: z.string().uuid(),
  generationContextHash: z.string().min(16),
  generationSequence: z.number().int().positive(),
  kbVersion: z.number().int().min(0),
  detailLevel: z.enum(["compact", "standard", "technical"]),
  confidence: z.number().min(0).max(1),
  confidenceTier: z.enum(["high", "medium", "low"]),
  confidenceFactors: confidenceFactorsSchema,
  generatedAt: z.string(),
  matchedEntries: z.array(
    z.object({
      slug: z.string(),
      score: z.number(),
      matchedBy: z.array(z.string()),
    }),
  ),
});

export type GeneratedDescriptionLineContract = z.infer<typeof generatedDescriptionLineSchema>;
export type DescriptionEngineMetaContract = z.infer<typeof descriptionEngineMetaSchema>;
