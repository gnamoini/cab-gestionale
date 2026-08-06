import { devInvariantCompatReadGuard } from "@/lib/magazzino/compat/compat-read-guard";
import { resolveCompatibilitaRicambio } from "@/lib/magazzino/compat/resolve-compatibilita-ricambio";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { buildSearchDocumentFromFields } from "@/lib/search/build-document";

/** Haystack search unificato — output SSOT con marker campo. */
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
  const alt = ricambio.fornitoriAlternativi ?? [];

  return buildSearchDocumentFromFields(
    [
      { kind: "code", value: ricambio.codiceFornitoreOriginale },
      { kind: "code", value: ricambio.codiceFornitoreOriginaleSecondario, alt: true },
      { kind: "brand", value: ricambio.marcaOriginaleSecondaria },
      { kind: "code", value: ricambio.codiceFornitoreNonOriginale, alt: true },
      { kind: "description", value: ricambio.descrizione },
      { kind: "note", value: ricambio.note },
      { kind: "category", value: ricambio.categoria },
      { kind: "brand", value: ricambio.marca },
      { kind: "customer", value: ricambio.fornitoreNonOriginale },
      ...alt.map((a) => ({ kind: "customer" as const, value: a.fornitore })),
      ...alt.map((a) => ({ kind: "brand" as const, value: a.produttore })),
      ...alt.map((a) => ({ kind: "code" as const, value: a.codice, alt: true })),
    ],
    [
      ricambio.usatoInTagliandi ? "tagliando" : "",
      ...resolved.labels,
      ...resolved.displayLines,
      resolved.display,
      ...resolved.orphanLabels,
    ],
  );
}
