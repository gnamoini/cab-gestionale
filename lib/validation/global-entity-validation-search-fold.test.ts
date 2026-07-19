import assert from "node:assert/strict";
import {
  entityAutocompleteKey,
  foldSearchConfusables,
  normalizeEntityString,
  scoreEntityMatch,
} from "@/lib/validation/global-entity-validation";
import { filterListSelectSuggestions } from "@/lib/ui/list-select-utils";

assert.equal(foldSearchConfusables("tec"), "tek");
assert.equal(normalizeEntityString("TEC"), normalizeEntityString("TEK"));
assert.equal(entityAutocompleteKey("A.C.TEC"), entityAutocompleteKey("A.C.TEK"));

assert.ok(scoreEntityMatch("TEC", "TEK") >= 80);
assert.ok(scoreEntityMatch("tek", "TEC") >= 80);

const options = ["FILTRO TEC", "OLIO MOTORE", "TEKTRONIX"];
assert.ok(filterListSelectSuggestions("tec", options).some((o) => o.includes("TEC")));
assert.ok(filterListSelectSuggestions("tek", options).some((o) => o.includes("TEC")));

console.log("global-entity-validation-search-fold.test.ts ok");
