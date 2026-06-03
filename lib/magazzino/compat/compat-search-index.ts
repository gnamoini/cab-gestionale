import { buildNormalizedSearchHaystack } from "@/lib/validation/entity-keys";
import { devInvariantCompatReadGuard } from "@/lib/magazzino/compat/compat-read-guard";
import { resolveCompatibilitaRicambio } from "@/lib/magazzino/compat/resolve-compatibilita-ricambio";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";

/** Haystack search unificato — solo output SSOT (labels, display, orphan). */
export function normalizedSearchIndex(
  ricambio: RicambioMagazzino,
  liste?: MezziListePrefs,
): string {
  if (!liste) {
    devInvariantCompatReadGuard("compat-search-index.normalizedSearchIndex", {
      accessKind: "searchIndex",
      ricambioId: ricambio.id,
      hasListePrefs: false,
    });
  }

  const resolved = resolveCompatibilitaRicambio(ricambio, liste);

  return buildNormalizedSearchHaystack([
    ricambio.marca,
    ricambio.codiceFornitoreOriginale,
    ricambio.codiceFornitoreOriginaleSecondario,
    ricambio.codiceFornitoreNonOriginale,
    ricambio.descrizione,
    ricambio.note,
    ricambio.categoria,
    ricambio.fornitoreNonOriginale,
    ...resolved.labels,
    ...resolved.displayLines,
    resolved.display,
    ...resolved.orphanLabels,
  ]);
}
