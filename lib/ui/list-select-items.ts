import {
  filterListSelectSuggestions,
  findExactListOption,
  isValueInListOptions,
  normListSelectValue,
  scoreListSelectOption,
  uniqueSortedOptions,
} from "@/lib/ui/list-select-utils";

export type ListSelectItem = { value: string; label: string };

export function filterItemSelectSuggestions(
  query: string,
  items: readonly ListSelectItem[],
  limit = 12,
): ListSelectItem[] {
  const q = query.trim();
  if (!q) {
    return [...items].slice(0, limit);
  }
  return [...items]
    .map((item) => ({ item, score: scoreListSelectOption(query, item.label) }))
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.item.label.localeCompare(b.item.label, "it"),
    )
    .slice(0, limit)
    .map((x) => x.item);
}

export function findItemByValue(
  value: string,
  items: readonly ListSelectItem[],
): ListSelectItem | null {
  const v = value.trim();
  if (!v) return null;
  return items.find((i) => i.value === v) ?? null;
}

export function findItemByLabel(
  label: string,
  items: readonly ListSelectItem[],
): ListSelectItem | null {
  const exact = findExactListOption(label, items.map((i) => i.label));
  if (!exact) return null;
  return items.find((i) => normListSelectValue(i.label) === normListSelectValue(exact)) ?? null;
}

export function isValueInItems(value: string, items: readonly ListSelectItem[]): boolean {
  if (!value.trim()) return false;
  return findItemByValue(value, items) !== null;
}

export { filterListSelectSuggestions, isValueInListOptions, uniqueSortedOptions };
