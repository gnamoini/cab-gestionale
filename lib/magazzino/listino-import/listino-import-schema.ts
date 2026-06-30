import { z } from "zod";

export const listinoImportPreviewRequestSchema = z.object({
  documentoId: z.string().uuid(),
});

export const listinoImportDecisionSchema = z.object({
  rowIndex: z.number().int().min(0),
  action: z.enum(["create", "skip", "update"]),
  codice: z.string().min(1),
  descrizione: z.string().min(1),
  costo: z.number().nonnegative(),
  marca: z.string().optional(),
  duplicateRicambioId: z.string().uuid().optional(),
});

export const listinoImportExecuteRequestSchema = z.object({
  documentoId: z.string().uuid(),
  batchId: z.string().uuid(),
  decisions: z.array(listinoImportDecisionSchema).min(1).max(5000),
});

export const listinoImportAiRowSchema = z.object({
  codice: z.string(),
  descrizione: z.string(),
  costo: z.number().nonnegative(),
  marca: z.string().optional(),
});

export const listinoImportAiRowsSchema = z.object({
  rows: z.array(listinoImportAiRowSchema).max(2000),
  warnings: z.array(z.string()).optional(),
});

export const listinoImportColumnMapSchema = z.object({
  codiceColumn: z.number().int().min(0).nullable(),
  descrizioneColumn: z.number().int().min(0).nullable(),
  costoColumn: z.number().int().min(0).nullable(),
  marcaColumn: z.number().int().min(0).nullable(),
  headerRowIndex: z.number().int().min(0),
  dataStartRowIndex: z.number().int().min(0),
  warnings: z.array(z.string()).optional(),
});
