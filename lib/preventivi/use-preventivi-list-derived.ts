"use client";

import { useMemo } from "react";
import {
  buildPreventiviFilterCatalog,
  type PreventiviFilterCatalog,
} from "@/lib/preventivi/preventivi-advanced-filters";
import { preventivoRowSearchHaystack } from "@/lib/preventivi/preventivi-list-ui-filters";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { PreventivoRecord } from "@/lib/preventivi/types";

export type PreventiviListDerived = {
  filterCatalog: PreventiviFilterCatalog;
  searchHaystackById: Map<string, string>;
};

/** Single-pass derived su `rows` — catalogo filtri + haystack ricerca. */
export function usePreventiviListDerived(
  rows: readonly PreventivoRecord[],
  listePrefs: MezziListePrefs,
): PreventiviListDerived {
  return useMemo(() => {
    const filterCatalog = buildPreventiviFilterCatalog(rows, listePrefs);
    const searchHaystackById = new Map<string, string>();
    for (const r of rows) {
      searchHaystackById.set(r.id, preventivoRowSearchHaystack(r));
    }
    return { filterCatalog, searchHaystackById };
  }, [rows, listePrefs]);
}
