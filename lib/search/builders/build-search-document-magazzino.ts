import { normalizedSearchIndex } from "@/lib/magazzino/compat/compat-search-index";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";

export function buildSearchDocumentMagazzino(
  row: RicambioMagazzino,
  listePrefs?: MezziListePrefs,
): string {
  return normalizedSearchIndex(row, listePrefs);
}
