import { magazzinoRowMatchesPageFilters, type MagazzinoPageFilters } from "@/lib/magazzino/magazzino-list-ui-filters";
import { isLikelyRicambioCodice } from "@/lib/magazzino/ricambio-code-intent";
import { normalizeRicambioCodice } from "@/lib/magazzino/ricambio-codice";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";

// Seeds only when code intent score >= threshold and list shows zero rows.
export function resolveMagazzinoNewRicambioSeedCodice(input: {
  searchQuery: string;
  prodotti: readonly RicambioMagazzino[];
  pageFilters: MagazzinoPageFilters;
  mezziListePrefs?: MezziListePrefs;
}): string | null {
  const q = input.searchQuery.trim();
  if (!q) return null;

  if (!isLikelyRicambioCodice(q)) return null;

  const matches = input.prodotti.filter((p) =>
    magazzinoRowMatchesPageFilters(
      p,
      { ...input.pageFilters, search: q },
      input.mezziListePrefs,
    ),
  );
  if (matches.length > 0) return null;

  return normalizeRicambioCodice(q);
}
