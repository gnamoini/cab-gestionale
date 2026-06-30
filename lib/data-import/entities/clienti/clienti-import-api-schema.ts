import { z } from "zod";
import { decodeImportFileBase64 } from "@/lib/data-import/entities/magazzino/magazzino-import-api-schema";

export { decodeImportFileBase64 };

export const clientiImportParseRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileBase64: z.string().min(1),
  sheetIndex: z.number().int().min(0).optional(),
});

export const clientiImportPreviewRequestSchema = z.object({
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

export const clientiImportExecuteRequestSchema = z.object({
  batchId: z.string().uuid(),
  fileName: z.string().min(1),
  mapping: clientiImportPreviewRequestSchema.shape.mapping,
  decisions: z.array(
    z.object({
      rowIndex: z.number().int().min(1),
      action: z.enum(["skip", "update", "create"]),
      nomeDisplay: z.string(),
      ragioneSociale: z.string().optional(),
      partitaIva: z.string().optional(),
      codiceFiscale: z.string().optional(),
      codiceDestinatario: z.string().optional(),
      pec: z.string().optional(),
      email: z.string().optional(),
      telefono: z.string().optional(),
      note: z.string().optional(),
      duplicateClienteId: z.string().uuid().optional(),
    }),
  ),
});
