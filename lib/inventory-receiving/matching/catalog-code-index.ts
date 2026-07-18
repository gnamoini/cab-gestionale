import { normalizeItemCode, normalizeItemCodeLoose } from "@/lib/inventory/normalization";
import { allCodiciFornitoriAlternativi } from "@/lib/magazzino/ricambio-fornitori-alternativi";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

function catalogCodesForItem(item: RicambioMagazzino): string[] {
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

export function buildCatalogCodeIndex(items: RicambioMagazzino[]): Map<string, RicambioMagazzino> {
  const index = new Map<string, RicambioMagazzino>();
  for (const item of items) {
    for (const code of catalogCodesForItem(item)) {
      for (const key of [normalizeItemCode(code), normalizeItemCodeLoose(code)]) {
        if (key && !index.has(key)) index.set(key, item);
      }
    }
  }
  return index;
}

export function findCatalogItemByCode(
  index: Map<string, RicambioMagazzino>,
  rawCode: string,
): RicambioMagazzino | null {
  const trimmed = rawCode.trim();
  if (!trimmed) return null;
  return (
    index.get(normalizeItemCode(trimmed)) ??
    index.get(normalizeItemCodeLoose(trimmed)) ??
    null
  );
}
