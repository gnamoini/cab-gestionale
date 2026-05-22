import assert from "node:assert/strict";
import {
  filterListSelectSuggestions,
  findExactListOption,
  normAutocompleteKey,
  scoreListSelectOption,
} from "@/lib/ui/list-select-utils";

assert.equal(normAutocompleteKey("CE.RE.BA"), "cereba");
assert.equal(normAutocompleteKey("cereba"), "cereba");

assert.ok(scoreListSelectOption("cereba", "CE.RE.BA") > 0);
assert.equal(scoreListSelectOption("cereba", "CE.RE.BA"), 100);

assert.equal(findExactListOption("cereba", ["CE.RE.BA", "Beta"]), "CE.RE.BA");
assert.equal(findExactListOption("beta", ["CE.RE.BA", "Beta"]), "Beta");

const suggestions = filterListSelectSuggestions("cereba", ["CE.RE.BA", "Gamma", "Beta"]);
assert.ok(suggestions.includes("CE.RE.BA"));
assert.equal(suggestions.includes("Gamma"), false);

console.log("list-select-utils.test.ts: ok");
