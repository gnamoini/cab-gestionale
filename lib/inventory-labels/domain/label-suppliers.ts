import type { RicambioFornitoreAlternativo } from "@/lib/magazzino/types";
import type { LabelSupplier } from "@/lib/inventory-labels/domain/types";
import { normalizeRicambioCodice } from "@/lib/magazzino/ricambio-codice";

export function dedupeLabelSuppliers(suppliers: readonly LabelSupplier[]): LabelSupplier[] {
  const seen = new Set<string>();
  const out: LabelSupplier[] = [];
  for (const s of suppliers) {
    const name = s.name.trim();
    const code = s.code?.trim() ?? "";
    if (!name && !code) continue;
    const key = `${name.toLowerCase()}|${code.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, code: code || null });
  }
  return out;
}

export function labelSuppliersFromAlternativi(
  rows: readonly RicambioFornitoreAlternativo[],
): LabelSupplier[] {
  return dedupeLabelSuppliers(
    rows.map((row) => ({
      name: row.fornitore.trim(),
      code: row.codice.trim() ? normalizeRicambioCodice(row.codice.trim()) : null,
    })),
  );
}

export type SupplierLayoutMode = "inline-slash" | "stacked-pairs";

export function resolveSupplierBlock(
  suppliers: readonly LabelSupplier[],
  mode: SupplierLayoutMode,
): { fornitoreLines: string[]; codiceLines: string[] } {
  if (!suppliers.length) return { fornitoreLines: [], codiceLines: [] };

  if (mode === "stacked-pairs") {
    const fornitoreLines: string[] = [];
    const codiceLines: string[] = [];
    for (const s of suppliers) {
      if (s.name) fornitoreLines.push(s.name);
      if (s.code) codiceLines.push(s.code);
    }
    return { fornitoreLines, codiceLines };
  }

  const names = suppliers.map((s) => s.name).filter(Boolean);
  const codes = suppliers.map((s) => s.code).filter((c): c is string => Boolean(c));
  return {
    fornitoreLines: names.length ? [names.join(" / ")] : [],
    codiceLines: codes.length ? [codes.join(" / ")] : [],
  };
}
