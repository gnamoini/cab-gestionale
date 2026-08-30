import { buildRicambioCodiceEntityKey } from "@/lib/validation/entity-keys";
import { entityAutocompleteKey, normalizeEntityString } from "@/lib/validation/global-entity-validation";
import { allCodiciFornitoriAlternativi } from "@/lib/magazzino/ricambio-fornitori-alternativi";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { CandidatePartResolution } from "@/lib/ordini-fornitori/identifica-ricambio/types";

function codiceMatchKey(codiceRaw: string): string {
  const entityKey = buildRicambioCodiceEntityKey(codiceRaw);
  if (entityKey) {
    const pipe = entityKey.indexOf("|");
    return pipe >= 0 ? entityKey.slice(0, pipe) : entityKey;
  }
  return normalizeEntityString(codiceRaw).replace(/\s+/g, " ");
}

function ricambioCodiciForMatch(item: RicambioMagazzino): string[] {
  const codes: string[] = [];
  const primary = item.codiceFornitoreOriginale.trim();
  const secondary = item.codiceFornitoreOriginaleSecondario.trim();
  if (primary) codes.push(primary);
  if (secondary) codes.push(secondary);
  const altCodici = allCodiciFornitoriAlternativi(item.fornitoriAlternativi ?? []);
  if (!altCodici.length && item.codiceFornitoreNonOriginale.trim()) {
    codes.push(item.codiceFornitoreNonOriginale);
  }
  codes.push(...altCodici);
  return codes;
}

function findAllByCodici(items: readonly RicambioMagazzino[], codiceRaw: string): RicambioMagazzino[] {
  const keysToMatch = new Set<string>();
  const looseToMatch = new Set<string>();
  const key = codiceMatchKey(codiceRaw);
  const looseKey = entityAutocompleteKey(codiceRaw);
  if (key) keysToMatch.add(key);
  if (looseKey) looseToMatch.add(looseKey);
  if (keysToMatch.size === 0 && looseToMatch.size === 0) return [];

  const matchedIds = new Set<string>();
  const out: RicambioMagazzino[] = [];
  for (const item of items) {
    for (const code of ricambioCodiciForMatch(item)) {
      const itemKey = codiceMatchKey(code);
      const itemLoose = entityAutocompleteKey(code);
      const hit =
        (itemKey && keysToMatch.has(itemKey)) || (itemLoose && looseToMatch.has(itemLoose));
      if (hit && !matchedIds.has(item.id)) {
        matchedIds.add(item.id);
        out.push(item);
      }
    }
  }
  return out;
}

export function resolveRicambioMatch(
  items: readonly RicambioMagazzino[],
  codice: string | null,
  candidateId: string,
): CandidatePartResolution {
  const base = { candidateId, ricambioId: null as string | null, matchKind: "none" as const };
  if (!codice?.trim()) return base;
  const matches = findAllByCodici(items, codice.trim());
  if (matches.length === 0) return base;
  if (matches.length === 1) {
    return { candidateId, ricambioId: matches[0]!.id, matchKind: "exact" };
  }
  return { candidateId, ricambioId: null, matchKind: "ambiguous" };
}
