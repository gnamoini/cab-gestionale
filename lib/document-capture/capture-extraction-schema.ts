import { z } from "zod";

export const extractedFieldSchema = z.object({
  value: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export const captureExtractionSchema = z.object({
  schedaTipo: z.enum(["ingresso", "lavorazioni", "ricambi"]).optional(),
  fields: z.record(z.string(), extractedFieldSchema),
  warnings: z.array(z.string()).optional(),
});

export type CaptureExtractionResult = z.infer<typeof captureExtractionSchema>;
