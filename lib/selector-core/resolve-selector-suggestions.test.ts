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

const monthItems = [
  { value: "1", label: "Gennaio" },
  { value: "2", label: "Febbraio" },
  { value: "4", label: "Aprile" },
  { value: "8", label: "Agosto" },
  { value: "12", label: "Dicembre" },
];

assert.deepEqual(
  resolveSelectorSuggestions({
    mode: "items",
    selectOnly: true,
    useSheet: false,
    sheetQuery: "",
    engineInput: { ...baseEngineInput, mode: "items", items: monthItems },
    suggestionSearchText: "",
    options: [],
    items: monthItems,
    selectedValue: "4",
    recentValues: [],
    preserveItemOrder: true,
  }).map((i) => (typeof i === "string" ? i : i.label)),
  ["Gennaio", "Febbraio", "Aprile", "Agosto", "Dicembre"],
  "preserveItemOrder keeps chronological month list (not A→Z)",
);

console.log("resolve-selector-suggestions.test.ts OK");
