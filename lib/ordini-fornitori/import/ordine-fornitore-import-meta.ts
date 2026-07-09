import type { ImportSourceRef } from "@/lib/import-sources/types";
import {
  ORDINE_FORNITORE_IMPORT_EXTRACTION_VERSION,
  type ImportQuality,
  type OrdineFornitoreImportMeta,
} from "@/lib/ordini-fornitori/import/ordine-fornitore-import-types";

export function buildOrdineImportMeta(input: {
  importSource: ImportSourceRef;
  contentHash: string;
  semanticKey?: string | null;
  importedBy: string;
  quality: ImportQuality;
}): OrdineFornitoreImportMeta {
  return {
    source: "supplier_quote",
    importSource: input.importSource,
    contentHash: input.contentHash,
    semanticKey: input.semanticKey ?? undefined,
    importedAt: new Date().toISOString(),
    importedBy: input.importedBy,
    extractionVersion: ORDINE_FORNITORE_IMPORT_EXTRACTION_VERSION,
    quality: input.quality,
  };
}

export function ordineRecordMetaWithImport(
  existing: Record<string, unknown> | undefined,
  importMeta: OrdineFornitoreImportMeta,
): Record<string, unknown> {
  return { ...(existing ?? {}), import: importMeta };
}
