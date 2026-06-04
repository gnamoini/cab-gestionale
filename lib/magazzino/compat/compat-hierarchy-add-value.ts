import { compatLabelMarcaModello, parseCompatMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import type { GlobalSettingsHierarchyKind } from "@/src/lib/global-list/global-settings-list-keys";

/** Normalizza il valore aggiunto da CompatHierarchyMultiSelect (creazione inline o scelta elenco). */
export function compatHierarchyMultiAddValue(
  hierarchyKind: GlobalSettingsHierarchyKind,
  rawValue: string,
  marcaNome?: string,
): string | null {
  const value = rawValue.trim();
  if (!value) return null;
  if (hierarchyKind !== "modello") return value;

  const marca = marcaNome?.trim() ?? "";
  if (!marca) return null;

  const parsed = parseCompatMarcaModello(value);
  if (parsed.modello && parsed.marca) {
    return compatLabelMarcaModello(parsed.marca, parsed.modello);
  }
  if (parsed.modello) {
    return compatLabelMarcaModello(marca, parsed.modello);
  }
  return compatLabelMarcaModello(marca, value);
}
