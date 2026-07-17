"use client";

import { useMemo } from "react";
import { analyzeArchiveDuplicateCodes } from "@/lib/magazzino/duplicates";
import { readCompatLabelsForUi } from "@/lib/magazzino/compat/compat-read-guard";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

export type MagazzinoListDerived = {
  sottoScortaList: RicambioMagazzino[];
  sottoScortaTotale: number;
  generatedListinoCount: number;
  marcheFromRows: string[];
  categorieFromRows: string[];
  fornitoriFromRows: string[];
  mezziFromRows: string[];
  archivioDupCodeGroups: ReturnType<typeof analyzeArchiveDuplicateCodes>;
  archivioDupCodeCount: number;
};

/** Single-pass scan su `prodotti` — sotto-scorta, listino, master row values, duplicati. */
export function useMagazzinoListDerived(
  prodotti: readonly RicambioMagazzino[],
  mezziListePrefs: MezziListePrefs,
): MagazzinoListDerived {
  return useMemo(() => {
    const sottoScortaList: RicambioMagazzino[] = [];
    let generatedListinoCount = 0;
    const marcheFromRows: string[] = [];
    const categorieFromRows: string[] = [];
    const fornitoriFromRows: string[] = [];
    const mezziFromRows: string[] = [];

    for (const p of prodotti) {
      if (p.scorta < p.scortaMinima) sottoScortaList.push(p);
      if (p.listinoImport?.generatoAutomaticamente) generatedListinoCount += 1;
      marcheFromRows.push(p.marca);
      categorieFromRows.push(p.categoria);
      const first = p.fornitoreNonOriginale.trim();
      if (first) fornitoriFromRows.push(first);
      for (const alt of p.fornitoriAlternativi ?? []) {
        const f = alt.fornitore.trim();
        if (f) fornitoriFromRows.push(f);
      }
      readCompatLabelsForUi(p, mezziListePrefs, "useMagazzinoListDerived.mezzi").forEach((m) =>
        mezziFromRows.push(m),
      );
    }

    const archivioDupCodeGroups = analyzeArchiveDuplicateCodes([...prodotti]);

    return {
      sottoScortaList,
      sottoScortaTotale: sottoScortaList.length,
      generatedListinoCount,
      marcheFromRows,
      categorieFromRows,
      fornitoriFromRows,
      mezziFromRows,
      archivioDupCodeGroups,
      archivioDupCodeCount: archivioDupCodeGroups.length,
    };
  }, [prodotti, mezziListePrefs]);
}
