import { z } from "zod";

export const confidenceBandSchema = z.enum(["high", "medium", "low"]);
export type ConfidenceBand = z.infer<typeof confidenceBandSchema>;

export const priceEvidenceSchema = z.object({
  amount: z.number(),
  currency: z.string().min(1),
  priceType: z.enum(["list", "net", "web", "unknown"]),
  sourceId: z.string().optional(),
  sourceTitle: z.string().optional(),
  pageNumber: z.number().int().optional(),
  taxStatus: z.enum(["incl", "excl", "unknown"]).optional(),
  observedAt: z.string().optional(),
});

export type PriceEvidence = z.infer<typeof priceEvidenceSchema>;

export const partEvidenceSchema = z.object({
  type: z.enum([
    "catalog",
    "exploded_view",
    "parts_table",
    "price_list",
    "manufacturer",
    "web",
    "historical_confirmation",
    "visual",
  ]),
  documentId: z.string().uuid().optional(),
  pageNumber: z.number().int().optional(),
  positionNumber: z.string().optional(),
  url: z.string().url().optional(),
  title: z.string(),
  excerpt: z.string().optional(),
  priority: z.number().int().optional(),
});

export type PartEvidence = z.infer<typeof partEvidenceSchema>;

export const sparePartVisualAnalysisSchema = z.object({
  partType: z.string().optional(),
  normalizedDescription: z.string(),
  manufacturer: z.string().optional(),
  vehicleBrand: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.string().optional(),
  visibleCodes: z.array(z.string()).default([]),
  dimensions: z.string().optional(),
  mountingCharacteristics: z.string().optional(),
  visualFeatures: z.array(z.string()).default([]),
  surroundingAssembly: z.string().optional(),
  uncertainty: z.string().optional(),
});

export type SparePartVisualAnalysis = z.infer<typeof sparePartVisualAnalysisSchema>;

export const sparePartSearchInputSchema = z.object({
  description: z.string().min(1),
  additionalInfo: z.string().optional(),
  vehicleBrand: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.string().optional(),
  vehiclePlateOrSerial: z.string().optional(),
  mezzoId: z.string().uuid().optional(),
  assetStoragePaths: z.array(z.string().min(1)).max(6).default([]),
});

export type SparePartSearchInput = z.infer<typeof sparePartSearchInputSchema>;

export const candidatePartSchema = z.object({
  candidatePartNumber: z.string().nullable(),
  verifiedPartNumber: z.string().nullable(),
  manufacturer: z.string().nullable(),
  description: z.string(),
  compatibility: z.array(
    z.object({
      brand: z.string().optional(),
      model: z.string().optional(),
      notes: z.string().optional(),
    }),
  ),
  priceCandidate: priceEvidenceSchema.nullable(),
  verifiedPrice: priceEvidenceSchema.nullable(),
  confidenceScore: z.number().min(0).max(1),
  confidenceBand: confidenceBandSchema,
  evidence: z.array(partEvidenceSchema),
});

export type CandidatePart = z.infer<typeof candidatePartSchema>;

export const sparePartIdentificationResultSchema = z.object({
  status: z.enum(["identified", "probable", "ambiguous", "not_found", "error"]),
  requestedPart: z.object({
    description: z.string(),
    manufacturer: z.string().optional(),
    vehicleBrand: z.string().optional(),
    vehicleModel: z.string().optional(),
  }),
  bestMatch: candidatePartSchema.nullable(),
  alternatives: z.array(candidatePartSchema),
  warnings: z.array(z.string()),
  sourcesConsulted: z.array(
    z.object({
      documentId: z.string().uuid().optional(),
      title: z.string(),
      status: z.enum(["ready", "indexing", "failed", "not_indexed", "consulted"]),
      indexQuality: z.string().optional(),
      webCount: z.number().int().optional(),
    }),
  ),
});

export type SparePartIdentificationResult = z.infer<typeof sparePartIdentificationResultSchema>;

export const pageClassificationSchema = z.object({
  pages: z.array(
    z.object({
      pageNumber: z.number().int().positive(),
      pageKind: z.enum(["text", "table", "exploded", "manual", "cover", "index", "price_list", "other"]),
      groupLabel: z.string().optional(),
    }),
  ),
});

export const partExtractionSchema = z.object({
  parts: z.array(
    z.object({
      pageNumber: z.number().int().positive(),
      diagramLabel: z.string().optional(),
      positionNumber: z.string().optional(),
      partNumberCandidate: z.string().optional(),
      partNumberVerified: z.string().optional(),
      description: z.string().optional(),
      quantity: z.string().optional(),
      source: z.enum(["table", "diagram", "both", "visual"]).default("table"),
    }),
  ),
});
