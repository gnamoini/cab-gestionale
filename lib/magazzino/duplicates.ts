import { buildRicambioCodiceEntityKey } from "@/lib/validation/entity-keys";
import { entityAutocompleteKey, normalizeEntityString } from "@/lib/validation/global-entity-validation";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

/**
 * Normalizza il codice fornitore originale per confronto:
 * trim, case-insensitive, spazi interni compressi (doppi spazi → uno).
 * @deprecated Preferire `buildRicambioCodiceEntityKey` / `normalizeEntityString`.
 */
export function normalizeMagazzinoCodiceOE(value: string): string {
  return normalizeEntityString(value).replace(/\s+/g, " ");
}

function codiceMatchKey(codiceRaw: string): string {
  const entityKey = buildRicambioCodiceEntityKey(codiceRaw);
  if (entityKey) {
    const pipe = entityKey.indexOf("|");
    return pipe >= 0 ? entityKey.slice(0, pipe) : entityKey;
  }
  return normalizeMagazzinoCodiceOE(codiceRaw);
}

function ricambioCodiciForMatch(item: RicambioMagazzino): string[] {
  const codes: string[] = [];
  const primary = item.codiceFornitoreOriginale.trim();
  const secondary = item.codiceFornitoreOriginaleSecondario.trim();
  if (primary) codes.push(primary);
  if (secondary) codes.push(secondary);
  return codes;
}

/** Primo ricambio in elenco con stesso codice OE normalizzato (escluso `excludeId` se presente). */
export function findFirstDuplicateByCodiceOriginale(
  items: RicambioMagazzino[],
  codiceRaw: string,
  options?: { excludeId?: string },
): RicambioMagazzino | null {
  return findDuplicateByCodici(items, codiceRaw, options);
}

/** Cerca duplicato su codice primario o secondario (cross-field). */
export function findDuplicateByCodici(
  items: RicambioMagazzino[],
  codiceRaw: string,
  options?: { excludeId?: string; alsoCheckSecondary?: string },
): RicambioMagazzino | null {
  const keysToMatch = new Set<string>();
  const looseToMatch = new Set<string>();

  for (const raw of [codiceRaw, options?.alsoCheckSecondary].filter(Boolean) as string[]) {
    const key = codiceMatchKey(raw);
    const looseKey = entityAutocompleteKey(raw);
    if (key) keysToMatch.add(key);
    if (looseKey) looseToMatch.add(looseKey);
  }

  if (keysToMatch.size === 0 && looseToMatch.size === 0) return null;

  for (const item of items) {
    if (options?.excludeId && item.id === options.excludeId) continue;
    for (const code of ricambioCodiciForMatch(item)) {
      const itemKey = codiceMatchKey(code);
      if (itemKey && keysToMatch.has(itemKey)) return item;
      const itemLoose = entityAutocompleteKey(code);
      if (itemLoose && looseToMatch.has(itemLoose)) return item;
    }
  }
  return null;
}

export type MagazzinoArchiveDuplicateCodeGroup = {
  /** Chiave normalizzata (unica per gruppo) */
  normalizedKey: string;
  /** Etichetta leggibile (primo codice grezzo del gruppo) */
  labelCode: string;
  items: RicambioMagazzino[];
};

/**
 * Raggruppa ricambi che condividono lo stesso codice OE normalizzato (≥2 per gruppo).
 */
export function analyzeArchiveDuplicateCodes(items: RicambioMagazzino[]): MagazzinoArchiveDuplicateCodeGroup[] {
  const map = new Map<string, RicambioMagazzino[]>();
  for (const it of items) {
    for (const code of ricambioCodiciForMatch(it)) {
      const k = codiceMatchKey(code);
      if (!k) continue;
      const arr = map.get(k);
      if (arr) {
        if (!arr.some((x) => x.id === it.id)) arr.push(it);
      } else {
        map.set(k, [it]);
      }
    }
  }
  const groups: MagazzinoArchiveDuplicateCodeGroup[] = [];
  for (const [normalizedKey, groupItems] of map) {
    if (groupItems.length < 2) continue;
    const sorted = [...groupItems].sort((a, b) => a.id.localeCompare(b.id));
    const labelCode = sorted[0]!.codiceFornitoreOriginale.trim() || normalizedKey;
    groups.push({ normalizedKey, labelCode, items: sorted });
  }
  return groups.sort((a, b) => a.labelCode.localeCompare(b.labelCode, "it"));
}
