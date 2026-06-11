import assert from "node:assert/strict";
import { resolveSelectorSuggestions } from "@/lib/selector-core/resolve-selector-suggestions";

const options = ["Beta Srl", "Alfa Spa", "Gamma Snc"];

const baseEngineInput = {
  mode: "strings" as const,
  value: "",
  searchText: "",
  focused: false,
  open: true,
  options,
};

assert.deepEqual(
  resolveSelectorSuggestions({
    mode: "strings",
    selectOnly: false,
    useSheet: true,
    sheetQuery: "",
    engineInput: baseEngineInput,
    suggestionSearchText: "",
    options,
    items: [],
    selectedValue: "",
    recentValues: [],
  }),
  ["Alfa Spa", "Beta Srl", "Gamma Snc"],
  "searchable sheet with empty query shows full browse list",
);

assert.deepEqual(
  resolveSelectorSuggestions({
    mode: "strings",
    selectOnly: false,
    useSheet: true,
    sheetQuery: "beta",
    engineInput: { ...baseEngineInput, searchText: "beta" },
    suggestionSearchText: "beta",
    options,
    items: [],
    selectedValue: "",
    recentValues: [],
  }),
  ["Beta Srl"],
  "searchable sheet filters with sheetQuery",
);

assert.deepEqual(
  resolveSelectorSuggestions({
    mode: "strings",
    selectOnly: false,
    useSheet: true,
    sheetQuery: "",
    engineInput: baseEngineInput,
    suggestionSearchText: "",
    options: Array.from({ length: 250 }, (_, i) => `Cliente ${i + 1}`),
    items: [],
    selectedValue: "",
    recentValues: [],
    browseCap: 250,
  }).length,
  250,
  "sheet browse uses browseCap for full global list",
);

assert.deepEqual(
  resolveSelectorSuggestions({
    mode: "strings",
    selectOnly: false,
    useSheet: false,
    sheetQuery: "",
    engineInput: { ...baseEngineInput, focused: true, searchText: "zzz" },
    suggestionSearchText: "zzz",
    options,
    items: [],
    selectedValue: "",
    recentValues: [],
  }),
  [],
  "desktop autocomplete still uses suggestionSearchText when not on sheet",
);

console.log("resolve-selector-suggestions.test.ts OK");
