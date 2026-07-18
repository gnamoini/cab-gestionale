import { z } from "zod";

export const ddtExtractionItemSchema = z.object({
  code: z.string().optional(),
  description: z.string(),
  ordered_quantity: z.number().optional(),
  delivered_quantity: z.number().optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const ddtExtractionSchema = z.object({
  supplier: z
    .object({
      ragioneSociale: z.string().optional(),
      partitaIva: z.string().optional(),
    })
    .optional(),
  document_number: z.string().optional(),
  date: z.string().optional(),
  document_confidence: z.number().min(0).max(1).optional(),
  items: z.array(ddtExtractionItemSchema).default([]),
  warnings: z.array(z.string()).optional(),
});

export const ddtReceivingAnalyzeRequestSchema = z.object({
  importFileId: z.string().uuid(),
  skipHashDuplicate: z.boolean().optional(),
});

export const ddtReceivingConfirmReviewSchema = z.object({
  decisions: z.array(
    z.object({
      lineId: z.string().uuid(),
      action: z.enum(["add", "create", "skip"]),
      receivedQuantity: z.number().min(0),
      finalItemId: z.string().uuid().optional(),
      newItem: z
        .object({
          codice: z.string().min(1),
          nome: z.string().min(1),
          marca: z.string().optional(),
          categoria: z.string().optional(),
          unitaMisura: z.string().optional(),
        })
        .optional(),
      manualMatchItemId: z.string().uuid().optional(),
    }),
  ),
});

export type DdtExtraction = z.infer<typeof ddtExtractionSchema>;
export type DdtExtractionItem = z.infer<typeof ddtExtractionItemSchema>;
