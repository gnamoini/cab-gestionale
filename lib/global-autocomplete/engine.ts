import {
  filterItemSelectSuggestions,
  findBestFuzzyListItem,
  findItemByLabel,
  findItemByValue,
  isValueInItems,
  type ListSelectItem,
} from "@/lib/ui/list-select-items";
import {
  filterListSelectSuggestions,
  findBestFuzzyListOption,
  findExactListOption,
  isValueInListOptions,
} from "@/lib/ui/list-select-utils";

export const AUTOCOMPLETE_BROWSE_CAP = 200;

export type AutocompleteDataMode = "strings" | "items";

export type AutocompleteEngineInput = {
  mode: AutocompleteDataMode;
  value: string;
  searchText: string;
  focused: boolean;
  open: boolean;
  options?: readonly string[];
  items?: readonly ListSelectItem[];
  browseCap?: number;
};

export function autocompleteIsEditing(input: Pick<AutocompleteEngineInput, "focused" | "searchText">): boolean {
  return input.focused || input.searchText.length > 0;
}

/** Valore mostrato a riposo (commit), prima di entrare in modifica. */
export function autocompleteCommittedDisplayValue(input: AutocompleteEngineInput): string {
  const { mode, value, items } = input;
  if (mode === "items" && items) {
    return findItemByValue(value, items)?.label ?? "";
  }
  return value;
}

export function autocompleteDisplayValue(input: AutocompleteEngineInput): string {
  if (autocompleteIsEditing(input)) return input.searchText;
  return autocompleteCommittedDisplayValue(input);
}

export function autocompleteFilterQuery(input: AutocompleteEngineInput): string {
  return autocompleteIsEditing(input) ? input.searchText : "";
}

export function autocompleteStringSuggestions(input: AutocompleteEngineInput): string[] {
  const q = autocompleteFilterQuery(input);
  return filterListSelectSuggestions(q, input.options ?? [], input.browseCap ?? AUTOCOMPLETE_BROWSE_CAP);
}

export function autocompleteItemSuggestions(input: AutocompleteEngineInput): ListSelectItem[] {
  const q = autocompleteFilterQuery(input);
  return filterItemSelectSuggestions(q, input.items ?? [], input.browseCap ?? AUTOCOMPLETE_BROWSE_CAP);
}

export function autocompleteFuzzySuggestion(
  searchText: string,
  mode: AutocompleteDataMode,
  options: readonly string[],
  items: readonly ListSelectItem[],
): string | ListSelectItem | null {
  const q = searchText.trim();
  if (!q) return null;
  if (mode === "items") return findBestFuzzyListItem(q, items);
  return findBestFuzzyListOption(q, options);
}

export function autocompleteIsValid(
  value: string,
  required: boolean,
  strictFromList: boolean,
  mode: AutocompleteDataMode,
  options: readonly string[],
  items: readonly ListSelectItem[],
): boolean {
  if (!strictFromList) return true;
  if (!value.trim()) return !required;
  if (mode === "items") return isValueInItems(value, items);
  return isValueInListOptions(value, options);
}

export function autocompleteCommitFromSearchText(
  searchText: string,
  mode: AutocompleteDataMode,
  options: readonly string[],
  items: readonly ListSelectItem[],
  strictFromList: boolean,
): string | null {
  const q = searchText.trim();
  if (!q) return null;
  if (mode === "items") {
    const byLabel = findItemByLabel(q, items);
    if (byLabel) return byLabel.value;
    return strictFromList ? null : q;
  }
  const exact = findExactListOption(q, options);
  if (exact) return exact;
  return strictFromList ? null : q;
}

export function autocompleteShowAddOption(params: {
  allowAdd: boolean;
  canAdd: boolean;
  hasOnAdd: boolean;
  open: boolean;
  disabled: boolean;
  isLoading: boolean;
}): boolean {
  return (
    params.allowAdd &&
    params.canAdd &&
    params.hasOnAdd &&
    params.open &&
    !params.disabled &&
    !params.isLoading
  );
}

/** @deprecated Usare `autocompleteShowAddOption`. */
export function autocompleteShowAddPanel(params: {
  allowAdd: boolean;
  canAdd: boolean;
  hasOnAdd: boolean;
  open: boolean;
  disabled: boolean;
  isLoading: boolean;
  searchText: string;
  suggestionCount: number;
}): boolean {
  return autocompleteShowAddOption(params);
}

export function autocompleteAddOptionEnabled(searchText: string, addPending: boolean): boolean {
  return searchText.trim().length > 0 && !addPending;
}
