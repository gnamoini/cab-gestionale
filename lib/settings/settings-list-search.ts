import { scoreSearchDocument } from "@/lib/search/match";
import { sortStringsItCaseInsensitive } from "@/lib/ui/sort-strings-it";

/** Filtra elenchi impostazioni con lo stesso motore ricerca toolbar. */
export function filterSettingsStringList(values: readonly string[], query: string): string[] {
  const q = query.trim();
  if (!q) return sortStringsItCaseInsensitive([...values]);
  const scored = values
    .map((value) => ({
      value,
      score: scoreSearchDocument(q, value).score,
      matches: scoreSearchDocument(q, value).matches,
    }))
    .filter((row) => row.matches)
    .sort((a, b) => b.score - a.score || a.value.localeCompare(b.value, "it"));
  return scored.map((row) => row.value);
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
  if (scoreSearchDocument(query, marcaNome).matches) return true;
  return modelNames.some((model) => scoreSearchDocument(query, model).matches);
}

/** Filtra albero marca/modello con scoring unificato. */
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
