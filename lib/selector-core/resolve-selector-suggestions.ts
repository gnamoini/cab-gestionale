import {
  autocompleteItemSuggestions,
  autocompleteStringSuggestions,
  AUTOCOMPLETE_BROWSE_CAP,
  type AutocompleteDataMode,
  type AutocompleteEngineInput,
} from "@/lib/global-autocomplete/engine";
import { filterItemSelectSuggestions } from "@/lib/ui/list-select-items";
import type { ListSelectItem } from "@/lib/ui/list-select-items";
import {
  filterListSelectSuggestions,
  scoreListSelectOption,
  compareListSelectLabel,
} from "@/lib/ui/list-select-utils";
import { rankOptions } from "@/lib/selector-core/selector-rank";

export type ResolveSelectorSuggestionsInput = {
  mode: AutocompleteDataMode;
  selectOnly: boolean;
  useSheet: boolean;
  sheetQuery: string;
  engineInput: AutocompleteEngineInput;
  suggestionSearchText: string;
  options: readonly string[];
  items: readonly ListSelectItem[];
  selectedValue: string;
  recentValues: readonly string[];
  recentsKey?: string;
  browseCap?: number;
  /** Solo A→Z con voce vuota in testa — no recenti / selezionato in cima. */
  alphabeticalBrowse?: boolean;
};

function sortAlphabeticalBrowsePool<T>(
  pool: readonly T[],
  getValue: (item: T) => string,
  getLabel: (item: T) => string,
): T[] {
  const sorted = [...pool].sort((a, b) => compareListSelectLabel(getLabel(a), getLabel(b)));
  const empty: T[] = [];
  const rest: T[] = [];
  for (const item of sorted) {
    if (!getValue(item).trim()) empty.push(item);
    else rest.push(item);
  }
  return [...empty, ...rest];
}

export function resolveSelectorSuggestions(
  input: ResolveSelectorSuggestionsInput,
): (string | ListSelectItem)[] {
  const cap = input.browseCap ?? AUTOCOMPLETE_BROWSE_CAP;
  const {
    mode,
    selectOnly,
    useSheet,
    sheetQuery,
    engineInput,
    suggestionSearchText,
    options,
    items,
    selectedValue,
    recentValues,
    recentsKey,
    alphabeticalBrowse,
  } = input;

  const itemsMode = mode === "items";

  /** Sheet mobile (searchable o list-only): filtra con `sheetQuery`, browse completo se vuota. */
  if (selectOnly || useSheet) {
    const sheetQ = useSheet ? sheetQuery.trim() : "";
    if (itemsMode) {
      let pool: readonly ListSelectItem[] = items;
      if (sheetQ) {
        pool = filterItemSelectSuggestions(sheetQ, items, items.length);
      }
      if (alphabeticalBrowse) {
        return sortAlphabeticalBrowsePool(pool, (i) => i.value, (i) => i.label).slice(0, cap);
      }
      return rankOptions({
        items: [...pool],
        getValue: (i) => i.value,
        getLabel: (i) => i.label,
        selectedValue,
        recentValues,
        query: sheetQ,
        scoreFn: scoreListSelectOption,
      }).slice(0, cap);
    }
    const unique = filterListSelectSuggestions("", options, options.length);
    let pool = unique;
    if (sheetQ) {
      pool = filterListSelectSuggestions(sheetQ, options, options.length);
    }
    if (alphabeticalBrowse) {
      return sortAlphabeticalBrowsePool(pool, (s) => s, (s) => s).slice(0, cap);
    }
    return rankOptions({
      items: pool,
      getValue: (s) => s,
      getLabel: (s) => s,
      selectedValue,
      recentValues,
      query: sheetQ,
      scoreFn: scoreListSelectOption,
    }).slice(0, cap);
  }

  let base: (string | ListSelectItem)[];
  const suggestionEngineInput = { ...engineInput, searchText: suggestionSearchText };
  if (itemsMode) {
    base = autocompleteItemSuggestions(suggestionEngineInput);
    if (recentsKey && recentValues.length > 0) {
      base = rankOptions({
        items: base as ListSelectItem[],
        getValue: (i) => i.value,
        getLabel: (i) => i.label,
        selectedValue,
        recentValues,
        query: suggestionSearchText,
        scoreFn: scoreListSelectOption,
      });
    }
  } else {
    base = autocompleteStringSuggestions(suggestionEngineInput);
    if (recentsKey && recentValues.length > 0) {
      base = rankOptions({
        items: base as string[],
        getValue: (s) => s,
        getLabel: (s) => s,
        selectedValue,
        recentValues,
        query: suggestionSearchText,
        scoreFn: scoreListSelectOption,
      });
    }
  }
  return base;
}
