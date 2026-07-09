import "server-only";

import type { ImportSourceRef } from "@/lib/import-sources/types";
import { processOrdineFornitoreImport } from "@/lib/ordini-fornitori/import/ordine-fornitore-import.processor";

/** @deprecated Usare processOrdineFornitoreImport con ImportSourceRef */
export async function buildOrdineFornitoreImportAnalyze(
  documentoId: string,
  userId: string,
  opts?: { skipHashDuplicate?: boolean; skipSemanticDuplicate?: boolean },
) {
  return processOrdineFornitoreImport({ type: "legacy_document", id: documentoId }, userId, opts);
}

export async function buildOrdineFornitoreImportAnalyzeFromSource(
  source: ImportSourceRef,
  userId: string,
  opts?: { skipHashDuplicate?: boolean; skipSemanticDuplicate?: boolean },
) {
  return processOrdineFornitoreImport(source, userId, opts);
}
