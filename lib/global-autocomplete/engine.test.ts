import assert from "node:assert/strict";
import {
  autocompleteCommitFromSearchText,
  autocompleteDisplayValue,
  autocompleteItemSuggestions,
  autocompleteStringSuggestions,
  type AutocompleteEngineInput,
} from "@/lib/global-autocomplete/engine";

function base(over: Partial<AutocompleteEngineInput>): AutocompleteEngineInput {
  return {
    mode: "strings",
    value: "",
    searchText: "",
    focused: false,
    open: false,
    options: ["Alpha", "Beta", "Gamma"],
    ...over,
  };
}

// Browse: focus con searchText vuoto → tutte le opzioni (cap)
const browse = autocompleteStringSuggestions(base({ focused: true, searchText: "" }));
assert.equal(browse.length, 3);

// Filtro live
const filtered = autocompleteStringSuggestions(base({ focused: true, searchText: "be" }));
assert.ok(filtered.includes("Beta"));
assert.equal(filtered.includes("Gamma"), false);

// Display: chiuso mostra value
assert.equal(autocompleteDisplayValue(base({ value: "Alpha", focused: false })), "Alpha");

// Display: aperto mostra searchText
assert.equal(
  autocompleteDisplayValue(base({ value: "Alpha", focused: true, searchText: "al" })),
  "al",
);

// Commit fuzzy/exact
assert.equal(
  autocompleteCommitFromSearchText("beta", "strings", ["Alpha", "Beta"], [], true),
  "Beta",
);

// Items mode
const items = [
  { value: "a", label: "Attesa" },
  { value: "b", label: "Bozza" },
];
const itemFiltered = autocompleteItemSuggestions({
  mode: "items",
  value: "a",
  searchText: "boz",
  focused: true,
  open: true,
  items,
});
assert.equal(itemFiltered.length, 1);
assert.equal(itemFiltered[0]?.value, "b");

console.log("global-autocomplete/engine.test.ts: ok");
