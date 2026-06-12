export const DOCUMENT_SEMANTIC_CLASSES = [
  "ddt",
  "fattura",
  "contratto",
  "report_interno",
  "allegato_tecnico",
  "generico",
] as const;

export type DocumentSemanticClass = (typeof DOCUMENT_SEMANTIC_CLASSES)[number];

export function isDocumentSemanticClass(value: string): value is DocumentSemanticClass {
  return (DOCUMENT_SEMANTIC_CLASSES as readonly string[]).includes(value);
}

export type ClassifyDocumentInput = {
  fileName: string;
  mimeType?: string;
  categoria?: string;
  lavorazioneTipo?: "ddt" | "preventivo_upload";
};

/** Heuristic classification (v1 — no OCR). */
export function classifyDocumentSemantic(input: ClassifyDocumentInput): DocumentSemanticClass {
  const name = input.fileName.trim().toLowerCase();
  if (input.lavorazioneTipo === "ddt" || /\bddt\b|documento.{0,6}trasporto/i.test(name)) {
    return "ddt";
  }
  if (/\bfattur|invoice|\bft[_-]/i.test(name)) return "fattura";
  if (/\bcontratt|contract/i.test(name)) return "contratto";
  if (
    input.categoria === "listini" ||
    /\breport\b|listino/i.test(name)
  ) {
    return "report_interno";
  }
  if (
    input.categoria === "manuali" ||
    input.categoria === "cataloghi" ||
    input.categoria === "certificazioni" ||
    /\bmanuale|catalogo|certific|scheda|tecnico/i.test(name)
  ) {
    return "allegato_tecnico";
  }
  return "generico";
}
