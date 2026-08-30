import { z } from "zod";
import type { ImportMappingConfig } from "@/lib/data-import/core/types";

export const magazzinoImportParseRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileBase64: z.string().min(1),
  sheetIndex: z.number().int().min(0).optional(),
});

export const magazzinoImportPreviewRequestSchema = z.object({
  batchId: z.string().uuid().optional(),
  fileName: z.string().min(1),
  fileBase64: z.string().min(1),
  mapping: z.object({
    headerRowIndex: z.number().int().min(0),
    dataStartRowIndex: z.number().int().min(0),
    sheetIndex: z.number().int().min(0),
    columns: z.array(
      z.object({
        sourceColumn: z.number().int().min(0),
        targetField: z.string().min(1),
      }),
    ),
  }),
  duplicateDefaultAction: z.enum(["skip", "update", "replace", "create_new"]).optional(),
});

export const magazzinoImportExecuteRequestSchema = z.object({
  batchId: z.string().uuid(),
  fileName: z.string().min(1),
  mapping: magazzinoImportPreviewRequestSchema.shape.mapping,
  rules: z
    .object({
      defaultAction: z.enum(["skip", "update", "replace", "create_new"]).optional(),
      updateFields: z.array(z.string()).optional(),
      autoCreateMasterLists: z.boolean().optional(),
    })
    .optional(),
  decisions: z.array(
    z.object({
      rowIndex: z.number().int().min(1),
      action: z.enum(["skip", "update", "replace", "create"]),
      codice: z.string(),
      descrizione: z.string(),
      marca: z.string().optional(),
      quantita: z.number().optional(),
      costo: z.number().optional(),
      prezzo_vendita: z.number().optional(),
      categoria: z.string().optional(),
      note: z.string().optional(),
      unita_misura: z.string().optional(),
      scorta_minima: z.number().optional(),
      sconto_percent: z.number().optional(),
      duplicateRicambioId: z.string().uuid().optional(),
    }),
  ),
});

export { decodeImportFileBase64 } from "@/lib/data-import/core/decode-import-file.server";

export type MagazzinoImportMapping = ImportMappingConfig;
