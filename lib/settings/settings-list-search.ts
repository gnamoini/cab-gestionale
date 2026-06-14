import { filterListSelectSuggestions, scoreListSelectOption } from "@/lib/ui/list-select-utils";
import { sortStringsItCaseInsensitive } from "@/lib/ui/sort-strings-it";

/** Filtra elenchi impostazioni con lo stesso motore fuzzy dei GlobalSelect. */
export function filterSettingsStringList(values: readonly string[], query: string): string[] {
  const q = query.trim();
  if (!q) return sortStringsItCaseInsensitive([...values]);
  return filterListSelectSuggestions(q, values);
}

export type SettingsHierarchyTreeNode = {
  nome: string;
  modelli: readonly { nome: string }[];
};

function hierarchyNodeMatchesQuery(
  query: string,
  marcaNome: string,
  modelNames: readonly string[],
): boolean {
  if (scoreListSelectOption(query, marcaNome) > 0) return true;
  return modelNames.some((model) => scoreListSelectOption(query, model) > 0);
}

/** Filtra albero marca/modello con lo stesso scoring fuzzy degli elenchi piatti. */
export function filterSettingsHierarchyTree<T extends SettingsHierarchyTreeNode>(
  tree: readonly T[],
  query: string,
): T[] {
  const q = query.trim();
  if (!q) return [...tree];
  return tree.filter((marca) =>
    hierarchyNodeMatchesQuery(
      q,
      marca.nome,
      marca.modelli.map((model) => model.nome),
    ),
  );
}
