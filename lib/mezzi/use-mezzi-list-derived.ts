"use client";

import { useMemo } from "react";
import { buildSearchDocumentMezzo } from "@/lib/search/builders/build-search-document-mezzo";
import { scoreSearchDocument } from "@/lib/search/match";
import { compareSearchRelevance, isSearchRelevanceSortActive } from "@/lib/search/sort-by-relevance";
import {
  compareMezzi,
  mezzoMatchesNumeroLavorazioniFilter,
  mezzoMatchesUltimaLavFilter,
  type NumeroLavorazioniFilter,
  type UltimaLavorazioneFilter,
} from "@/lib/mezzi/mezzi-helpers";
import {
  buildInterventiByMezzoIdFromLavorazioni,
  mezzoHaLavorazioneAttivaDb,
} from "@/lib/mezzi/interventi-from-lavorazioni-db";
import { filterMezziGestiti } from "@/lib/mezzi/mezzi-list-fetch";
import type { MezzoGestito, MezzoInterventoLavorazione, MezziSortKey, MezziSortPhase } from "@/lib/mezzi/types";
import type { MezzoFilters } from "@/src/services/mezzi.service";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

function naturalMezziOrder(a: MezzoGestito, b: MezzoGestito) {
  return a.id.localeCompare(b.id, "en");
}

export type MezziListDerived = {
  mezziUi: MezzoGestito[];
  filteredMezzi: MezzoGestito[];
  sorted: MezzoGestito[];
  interventiByMezzoId: Map<string, MezzoInterventoLavorazione[]>;
  inOfficina: (m: MezzoGestito) => boolean;
};

/** Client filter + sort + interventi index per lista anagrafica mezzi. */
export function useMezziListDerived(
  mezzoRows: readonly MezzoGestito[],
  serviceFilters: MezzoFilters,
  lavRows: readonly LavorazioneListRow[],
  sortColumn: MezziSortKey | null,
  sortPhase: MezziSortPhase,
  filtroUltimaLav: UltimaLavorazioneFilter,
  filtroNumeroLav: NumeroLavorazioniFilter,
  isAnagrafica: boolean,
): MezziListDerived {
  return useMemo(() => {
    if (!isAnagrafica) {
      return {
        mezziUi: [],
        filteredMezzi: [],
        sorted: [],
        interventiByMezzoId: new Map<string, MezzoInterventoLavorazione[]>(),
        inOfficina: () => false,
      };
    }

    const mezziUi = filterMezziGestiti([...mezzoRows], serviceFilters);
    const interventiByMezzoId = buildInterventiByMezzoIdFromLavorazioni(mezziUi, lavRows);

    const filteredMezzi = mezziUi.filter((m) => {
      const interventi = interventiByMezzoId.get(m.id) ?? [];
      if (!mezzoMatchesUltimaLavFilter(interventi, filtroUltimaLav)) return false;
      if (!mezzoMatchesNumeroLavorazioniFilter(interventi.length, filtroNumeroLav)) return false;
      return true;
    });

    const sorted = [...filteredMezzi];
    sorted.sort((a, b) => {
      if (isSearchRelevanceSortActive(serviceFilters.search ?? "", sortColumn)) {
        const rel = compareSearchRelevance(a, b, serviceFilters.search!, (row, q) =>
          scoreSearchDocument(q, buildSearchDocumentMezzo(row)).score,
        );
        if (rel !== 0) return rel;
      }
      return compareMezzi(
        a,
        b,
        sortColumn,
        sortPhase,
        naturalMezziOrder,
        (m) => interventiByMezzoId.get(m.id)?.[0]?.dataIngresso ?? "",
        (m) => interventiByMezzoId.get(m.id)?.length ?? 0,
      );
    });

    return {
      mezziUi,
      filteredMezzi,
      sorted,
      interventiByMezzoId,
      inOfficina: (m: MezzoGestito) => mezzoHaLavorazioneAttivaDb(m, lavRows),
    };
  }, [
    isAnagrafica,
    mezzoRows,
    serviceFilters,
    lavRows,
    sortColumn,
    sortPhase,
    filtroUltimaLav,
    filtroNumeroLav,
  ]);
}
