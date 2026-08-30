import type { DocumentSparePartsMeta } from "@/lib/documents/document-spare-parts-meta";
import { readDocumentSparePartsMeta } from "@/lib/documents/document-spare-parts-meta";

/** DB `documenti.categoria` usa `listino`; UI/API usano `listini`. */
const LISTINO_CATEGORIE = new Set(["listino", "listini"]);

export function isListinoCategoria(categoria: string | null | undefined): boolean {
  if (!categoria) return false;
  return LISTINO_CATEGORIE.has(categoria.trim().toLowerCase());
}

export function isListinoDocument(input: {
  categoria?: string | null;
  meta?: Record<string, unknown> | null;
  spare?: DocumentSparePartsMeta;
}): boolean {
  const spare = input.spare ?? readDocumentSparePartsMeta(input.meta);
  if (spare.aiDocumentKind === "price_list") return true;
  return isListinoCategoria(input.categoria);
}
