import { z } from "zod";
import { extractedFieldSchema } from "@/lib/document-capture/capture-extraction-schema";

export const ordineFornitoreImportRigaSchema = z.object({
  codice: extractedFieldSchema.optional(),
  codiceProduttore: extractedFieldSchema.optional(),
  descrizione: extractedFieldSchema,
  quantita: extractedFieldSchema,
  unita: extractedFieldSchema.optional(),
  prezzoUnitario: extractedFieldSchema,
  sconto: extractedFieldSchema.optional(),
  iva: extractedFieldSchema.optional(),
});

export const ordineFornitoreImportCostoSchema = z.object({
  tipo: z.enum(["trasporto", "imballo", "raee", "altro"]).optional(),
  descrizione: extractedFieldSchema,
  importo: extractedFieldSchema,
});

export const ordineFornitoreImportExtractionSchema = z.object({
  fornitore: z
    .object({
      ragioneSociale: extractedFieldSchema.optional(),
      partitaIva: extractedFieldSchema.optional(),
      codiceFiscale: extractedFieldSchema.optional(),
      indirizzo: extractedFieldSchema.optional(),
      telefono: extractedFieldSchema.optional(),
      email: extractedFieldSchema.optional(),
      referente: extractedFieldSchema.optional(),
    })
    .optional(),
  documento: z
    .object({
      numeroPreventivo: extractedFieldSchema.optional(),
      data: extractedFieldSchema.optional(),
      validita: extractedFieldSchema.optional(),
      condizioniPagamento: extractedFieldSchema.optional(),
      tempiConsegna: extractedFieldSchema.optional(),
      valuta: extractedFieldSchema.optional(),
      note: extractedFieldSchema.optional(),
    })
    .optional(),
  righe: z.array(ordineFornitoreImportRigaSchema).default([]),
  costiAggiuntivi: z.array(ordineFornitoreImportCostoSchema).default([]),
  warnings: z.array(z.string()).optional(),
});

export const ordineFornitoreImportAnalyzeRequestSchema = z.object({
  documentoId: z.string().uuid(),
  skipHashDuplicate: z.boolean().optional(),
  skipSemanticDuplicate: z.boolean().optional(),
});

export const ordineFornitoreImportFinalizeRequestSchema = z.object({
  documentoId: z.string().uuid(),
  action: z.enum(["link", "unlink"]),
  ordineId: z.string().uuid().optional(),
  contentHash: z.string().optional(),
  semanticKey: z.string().optional(),
});

export type OrdineFornitoreImportExtraction = z.infer<typeof ordineFornitoreImportExtractionSchema>;
export type ExtractedField = z.infer<typeof extractedFieldSchema>;
