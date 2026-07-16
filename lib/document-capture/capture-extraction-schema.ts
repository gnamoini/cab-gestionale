import { normalizeCaptureExtractedFieldKey } from "@/lib/document-capture/capture-field-key-aliases";
import { z } from "zod";

export const extractedFieldSchema = z.object({
  value: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export const captureExtractionFieldItemSchema = z.object({
  key: z.string().min(1).describe("Chiave campo CAB (es. cliente, data_ingresso, attrezzatura_marca)"),
  value: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

/** ponytail: array esplicito — z.record in structured output Gemini spesso torna {}. */
export const captureExtractionSchema = z.object({
  schedaTipo: z.enum(["ingresso", "lavorazioni", "ricambi"]).optional(),
  fields: z
    .array(captureExtractionFieldItemSchema)
    .describe("Elenco campi estratti dal documento; non lasciare vuoto se ci sono etichette o valori visibili."),
  warnings: z.array(z.string()).optional(),
});

export type CaptureExtractionResult = z.infer<typeof captureExtractionSchema>;

export type CaptureExtractionFieldEntry = {
  key: string;
  value: string | null;
  confidence: number;
};

/** Normalizza fields (array nuovo o record legacy in structured_response). */
export function listCaptureExtractionFields(fields: unknown): CaptureExtractionFieldEntry[] {
  if (Array.isArray(fields)) {
    return fields
      .filter((f): f is z.infer<typeof captureExtractionFieldItemSchema> => {
        return Boolean(f && typeof f === "object" && "key" in f && typeof (f as { key?: unknown }).key === "string");
      })
      .map((f) => ({
        key: normalizeCaptureExtractedFieldKey(f.key.trim()),
        value: f.value ?? null,
        confidence: f.confidence,
      }))
      .filter((f) => f.key.length > 0);
  }

  if (fields && typeof fields === "object") {
    return Object.entries(fields as Record<string, z.infer<typeof extractedFieldSchema>>).map(([key, field]) => ({
      key: normalizeCaptureExtractedFieldKey(key.trim()),
      value: field?.value ?? null,
      confidence: field?.confidence ?? 0,
    }));
  }

  return [];
}
