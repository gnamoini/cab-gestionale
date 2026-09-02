import {
  buildPreventivoSearchDocument,
  type PreventivoSearchDocumentContext,
} from "@/lib/preventivi/preventivo-search-document-contract";
import type { PreventivoRecord } from "@/lib/preventivi/types";

export type { PreventivoSearchDocumentContext };

export function buildSearchDocumentPreventivo(
  row: PreventivoRecord,
  ctx?: PreventivoSearchDocumentContext,
): string {
  return buildPreventivoSearchDocument(row, ctx);
}
