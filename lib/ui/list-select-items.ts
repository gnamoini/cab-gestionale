import {
  filterListSelectSuggestions,
  findBestFuzzyListOption,
  findExactListOption,
  isValueInListOptions,
  normListSelectValue,
  scoreListSelectOption,
  uniqueSortedOptions,
} from "@/lib/ui/list-select-utils";

export type ListSelectItem = { value: string; label: string };

const BROWSE_ITEMS_CAP = 200;

export function filterItemSelectSuggestions(
  query: string,
  items: readonly ListSelectItem[],
  limit?: number,
): ListSelectItem[] {
  const q = query.trim();
  if (!q) {
    const cap = limit ?? BROWSE_ITEMS_CAP;
    return [...items].slice(0, cap);
  }
  const ranked = [...items]
    .map((item) => ({ item, score: scoreListSelectOption(query, item.label) }))
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.item.label.localeCompare(b.item.label, "it"),
    );
  const cap = limit ?? ranked.length;
  return ranked.slice(0, cap).map((x) => x.item);
}

export function findBestFuzzyListItem(query: string, items: readonly ListSelectItem[]): ListSelectItem | null {
  const labels = items.map((i) => i.label);
  const best = findBestFuzzyListOption(query, labels);
  if (!best) return null;
  return items.find((i) => normListSelectValue(i.label) === normListSelectValue(best)) ?? null;
}

export function findItemByValue(
  value: string,
  items: readonly ListSelectItem[],
): ListSelectItem | null {
  const exact = items.find((i) => i.value === value);
  if (exact) return exact;
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
  return findItemByValue(value, items) !== null;
}

export { filterListSelectSuggestions, isValueInListOptions, uniqueSortedOptions };
