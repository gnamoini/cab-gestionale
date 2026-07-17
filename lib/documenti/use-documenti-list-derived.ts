"use client";

import { useMemo } from "react";
import {
  buildDocumentiFilteredView,
  buildDocumentiSearchHaystackById,
  type DocumentiPageFilters,
  type DocumentiSortState,
} from "@/lib/documenti/documenti-list-ui-filters";
import type { CatalogMarca } from "@/lib/documenti/documenti-catalog-types";
import type { DocumentoGestionale } from "@/lib/types/gestionale";
import type { MezzoGestito } from "@/lib/mezzi/types";

/** Single-pass haystack + filtered view per lista documenti. */
export function useDocumentiListDerived(
  docs: readonly DocumentoGestionale[],
  catalog: CatalogMarca[],
  mezziSnap: MezzoGestito[],
  pageFilters: DocumentiPageFilters,
  sort: DocumentiSortState,
) {
  return useMemo(() => {
    const searchHaystackById = buildDocumentiSearchHaystackById(docs, catalog);
    const filteredView = buildDocumentiFilteredView(docs, catalog, mezziSnap, pageFilters, sort, searchHaystackById);
    return { ...filteredView, searchHaystackById };
  }, [catalog, docs, mezziSnap, pageFilters, sort]);
}
