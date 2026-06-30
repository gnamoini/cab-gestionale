/** Tracciabilità ricambi creati da import listino documenti. */
export type ListinoImportMeta = {
  generatoAutomaticamente: true;
  documentoId: string;
  documentoNome: string;
  importatoAt: string;
  batchId: string;
};

export function parseListinoImportMeta(raw: unknown): ListinoImportMeta | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const m = raw as Record<string, unknown>;
  if (m.generatoAutomaticamente !== true) return undefined;
  const documentoId = typeof m.documentoId === "string" ? m.documentoId.trim() : "";
  const documentoNome = typeof m.documentoNome === "string" ? m.documentoNome.trim() : "";
  const importatoAt = typeof m.importatoAt === "string" ? m.importatoAt.trim() : "";
  const batchId = typeof m.batchId === "string" ? m.batchId.trim() : "";
  if (!documentoId || !batchId) return undefined;
  return {
    generatoAutomaticamente: true,
    documentoId,
    documentoNome: documentoNome || "Listino",
    importatoAt: importatoAt || new Date(0).toISOString(),
    batchId,
  };
}

export function buildListinoImportMeta(input: {
  documentoId: string;
  documentoNome: string;
  batchId: string;
  importatoAt?: string;
}): ListinoImportMeta {
  return {
    generatoAutomaticamente: true,
    documentoId: input.documentoId.trim(),
    documentoNome: input.documentoNome.trim() || "Listino",
    importatoAt: input.importatoAt ?? new Date().toISOString(),
    batchId: input.batchId.trim(),
  };
}

export function isRicambioGeneratoDaListino(meta: unknown): boolean {
  return parseListinoImportMeta(
    meta && typeof meta === "object" && !Array.isArray(meta)
      ? (meta as Record<string, unknown>).listinoImport
      : undefined,
  ) != null;
}

export function readListinoImportFromRicambioMeta(raw: unknown): ListinoImportMeta | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  return parseListinoImportMeta((raw as Record<string, unknown>).listinoImport);
}
