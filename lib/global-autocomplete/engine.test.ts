import assert from "node:assert/strict";
import {
  autocompleteCommitFromSearchText,
  autocompleteCommittedDisplayValue,
  autocompleteDisplayValue,
  autocompleteFilterQuery,
  autocompleteItemSuggestions,
  autocompleteStringSuggestions,
  autocompleteShowAddOption,
  autocompleteAddOptionEnabled,
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

// Seed open: query committata filtra subito (no browse flash con defer pending)
const seedOptions = ["A.C.T.A.", "Alpha", "Beta", "Gamma"];
const seedFiltered = autocompleteStringSuggestions(
  base({ focused: true, searchText: "A.C.T.A.", options: seedOptions }),
);
assert.ok(seedFiltered.includes("A.C.T.A."));
assert.equal(seedFiltered.includes("Alpha"), false);
const seedBrowse = autocompleteStringSuggestions(
  base({ focused: true, searchText: "", options: seedOptions }),
);
assert.equal(seedBrowse.length, 4);

// Display: chiuso mostra value
assert.equal(autocompleteDisplayValue(base({ value: "Alpha", focused: false })), "Alpha");

// Display: aperto mostra searchText
assert.equal(
  autocompleteDisplayValue(base({ value: "Alpha", focused: true, searchText: "al" })),
  "al",
);

// Display: searchText attivo anche senza focus (es. digitazione dopo select con focus DOM)
assert.equal(
  autocompleteDisplayValue(base({ value: "Alpha", focused: false, searchText: "al" })),
  "al",
);

// Filtro: query attiva con searchText anche senza focus
assert.equal(autocompleteFilterQuery(base({ focused: false, searchText: "be" })), "be");

// Committed display items mode
assert.equal(
  autocompleteCommittedDisplayValue({
    mode: "items",
    value: "a",
    searchText: "",
    focused: false,
    open: false,
    items: [
      { value: "a", label: "Attesa" },
      { value: "b", label: "Bozza" },
    ],
  }),
  "Attesa",
);

// Valore vuoto con opzione sentinel (es. "Tutti i dipendenti")
assert.equal(
  autocompleteCommittedDisplayValue({
    mode: "items",
    value: "",
    searchText: "",
    focused: false,
    open: false,
    items: [
      { value: "", label: "Tutti i dipendenti" },
      { value: "e1", label: "Mario Rossi" },
    ],
  }),
  "Tutti i dipendenti",
);

// Commit fuzzy/exact
assert.equal(
  autocompleteCommitFromSearchText("beta", "strings", ["Alpha", "Beta"], [], true),
  "Beta",
);

// Commit loose key (punteggiatura ignorata)
assert.equal(
  autocompleteCommitFromSearchText("cereba", "strings", ["CE.RE.BA", "Beta"], [], true),
  "CE.RE.BA",
);

// Display a riposo dopo editing con searchText vuoto
assert.equal(
  autocompleteDisplayValue(base({ value: "CE.RE.BA", focused: false, searchText: "" })),
  "CE.RE.BA",
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

const addBase = {
  allowAdd: true,
  canAdd: true,
  hasOnAdd: true,
  open: true,
  disabled: false,
  isLoading: false,
};

assert.equal(autocompleteShowAddOption(addBase), true);
assert.equal(autocompleteShowAddOption({ ...addBase, open: false }), false);
assert.equal(autocompleteShowAddOption({ ...addBase, allowAdd: false }), false);
assert.equal(autocompleteShowAddOption({ ...addBase, isLoading: true }), false);

assert.equal(autocompleteAddOptionEnabled(" nuovo ", false), true);
assert.equal(autocompleteAddOptionEnabled("   ", false), false);
assert.equal(autocompleteAddOptionEnabled("x", true), false);

console.log("global-autocomplete/engine.test.ts: ok");
