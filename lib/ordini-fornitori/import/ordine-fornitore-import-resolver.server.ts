import { findDuplicateByCodici } from "@/lib/magazzino/duplicates";
import { normalizeRicambioCodice } from "@/lib/magazzino/ricambio-codice";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { defaultPrezzoUnitarioOrdineFromRicambio } from "@/lib/ordini-fornitori/ordine-fornitore-ricambio-price";
import type { OrdineFornitoreImportExtraction } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-schema";
import {
  fieldConfidence,
  fieldValue,
  parseLocaleNumber,
} from "@/lib/ordini-fornitori/import/parse-locale-number";
import { entityAutocompleteKey, fuzzyMatchEntity } from "@/lib/validation/global-entity-validation";

export type ResolvedImportRiga = {
  codice: string;
  descrizione: string;
  quantita: number;
  prezzoUnitario: number;
  scontoPercent: number;
  ivaPercent: number;
  unitaMisura: string;
  ricambioId: string | null;
  matchMethod: "codice" | "descrizione" | "none";
  confidence: number;
};

function matchRicambioByDescrizione(
  items: RicambioMagazzino[],
  descrizione: string,
): RicambioMagazzino | null {
  const key = entityAutocompleteKey(descrizione);
  if (!key) return null;
  for (const item of items) {
    const hay = entityAutocompleteKey(`${item.descrizione} ${item.note}`);
    if (hay && hay === key) return item;
  }
  const fuzzy = fuzzyMatchEntity(descrizione, items.map((i) => i.descrizione).filter(Boolean));
  if (!fuzzy || fuzzy.score < 0.72) return null;
  return items.find((i) => i.descrizione === fuzzy.entity) ?? null;
}

function tryCodiceMatch(
  items: RicambioMagazzino[],
  codice: string,
  codiceAlt?: string,
): RicambioMagazzino | null {
  const primary = codice.trim();
  if (!primary && !codiceAlt?.trim()) return null;
  return findDuplicateByCodici(items, primary, {
    alsoCheckSecondary: codiceAlt?.trim() || undefined,
  });
}

export function resolveImportRighe(
  extraction: OrdineFornitoreImportExtraction,
  magazzinoItems: RicambioMagazzino[],
  fornitoreLabel: string,
  defaultIva = 22,
): ResolvedImportRiga[] {
  const out: ResolvedImportRiga[] = [];

  for (const row of extraction.righe) {
    const codice = fieldValue(row.codice) || fieldValue(row.codiceProduttore);
    const codiceProd = fieldValue(row.codiceProduttore);
    const descrizione = fieldValue(row.descrizione);
    if (!descrizione && !codice) continue;

    const qty = parseLocaleNumber(fieldValue(row.quantita), { decimals: 3, min: 0.001 }) ?? 1;
    const prezzoRaw = parseLocaleNumber(fieldValue(row.prezzoUnitario), { decimals: 2, min: 0 }) ?? 0;
    const sconto = parseLocaleNumber(fieldValue(row.sconto), { decimals: 2, min: 0, max: 100 }) ?? 0;
    const iva = parseLocaleNumber(fieldValue(row.iva), { decimals: 2, min: 0, max: 100 }) ?? defaultIva;
    const unita = fieldValue(row.unita) || "pz";

    let match = tryCodiceMatch(magazzinoItems, codice, codiceProd);
    let matchMethod: ResolvedImportRiga["matchMethod"] = match ? "codice" : "none";

    if (!match && codice) {
      const norm = normalizeRicambioCodice(codice);
      match = tryCodiceMatch(magazzinoItems, norm, codiceProd);
    }

    if (!match && descrizione) {
      match = matchRicambioByDescrizione(magazzinoItems, descrizione);
      if (match) matchMethod = "descrizione";
    }

    let finalCodice = codice;
    let finalDesc = descrizione;
    let prezzo = prezzoRaw;
    let scontoFinal = sconto;
    let ricambioId: string | null = null;
    const ivaFinal = iva;

    if (match) {
      ricambioId = match.id;
      finalCodice = match.codiceFornitoreOriginale || codice;
      finalDesc = match.descrizione || descrizione;
      const fromMag = defaultPrezzoUnitarioOrdineFromRicambio(match, fornitoreLabel);
      if (prezzoRaw <= 0) prezzo = fromMag.prezzo;
      if (sconto <= 0 && fromMag.scontoPercent > 0) scontoFinal = fromMag.scontoPercent;
    }

    const confParts = [
      fieldConfidence(row.descrizione),
      fieldConfidence(row.codice),
      fieldConfidence(row.quantita),
      fieldConfidence(row.prezzoUnitario),
    ];
    const confidence = confParts.reduce((a, b) => a + b, 0) / confParts.length;

    out.push({
      codice: finalCodice,
      descrizione: finalDesc || "Articolo",
      quantita: qty,
      prezzoUnitario: prezzo,
      scontoPercent: scontoFinal,
      ivaPercent: ivaFinal,
      unitaMisura: unita,
      ricambioId,
      matchMethod,
      confidence,
    });
  }

  return out;
}

export function countMatchedRighe(righe: ResolvedImportRiga[]): number {
  return righe.filter((r) => r.ricambioId).length;
}
