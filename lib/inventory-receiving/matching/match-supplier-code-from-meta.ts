import { normalizeItemCode } from "@/lib/inventory/normalization";
import { normFornitoreAlternativoKey } from "@/lib/magazzino/fornitore-alternativo-sconto";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

export function matchSupplierCodeFromMeta(
  items: RicambioMagazzino[],
  supplierLabel: string,
  rawCode: string,
): RicambioMagazzino | null {
  const codeKey = normalizeItemCode(rawCode);
  if (!codeKey) return null;
  const supplierKey = normFornitoreAlternativoKey(supplierLabel);

  for (const item of items) {
    for (const alt of item.fornitoriAlternativi ?? []) {
      const altSupplierKey = normFornitoreAlternativoKey(alt.fornitore);
      if (supplierKey && altSupplierKey && altSupplierKey !== supplierKey) continue;
      const altCodeKey = normalizeItemCode(alt.codice);
      if (altCodeKey && altCodeKey === codeKey) return item;
    }
    const legacyCode = normalizeItemCode(item.codiceFornitoreNonOriginale ?? "");
    if (legacyCode && legacyCode === codeKey) {
      if (!supplierKey) return item;
      const legacySupplier = normFornitoreAlternativoKey(item.fornitoreNonOriginale ?? "");
      if (legacySupplier === supplierKey) return item;
    }
  }
  return null;
}
