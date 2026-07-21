import assert from "node:assert/strict";
import {
  areQwertyAdjacent,
  entityAutocompleteKey,
  foldSearchConfusables,
  normalizeEntityString,
  scoreEntityMatch,
} from "@/lib/validation/global-entity-validation";
import { filterListSelectSuggestions, findBestFuzzyListOption } from "@/lib/ui/list-select-utils";

assert.equal(foldSearchConfusables("tec"), "tek");
assert.equal(normalizeEntityString("TEC"), normalizeEntityString("TEK"));
assert.equal(entityAutocompleteKey("A.C.TEC"), entityAutocompleteKey("A.C.TEK"));

assert.ok(scoreEntityMatch("TEC", "TEK") >= 80);
assert.ok(scoreEntityMatch("tek", "TEC") >= 80);

const options = ["FILTRO TEC", "OLIO MOTORE", "TEKTRONIX"];
assert.ok(filterListSelectSuggestions("tec", options).some((o) => o.includes("TEC")));
assert.ok(filterListSelectSuggestions("tek", options).some((o) => o.includes("TEC")));

// QWERTY adjacency map
assert.equal(areQwertyAdjacent("a", "s"), true);
assert.equal(areQwertyAdjacent("s", "a"), true);
assert.equal(areQwertyAdjacent("a", "m"), false);

// Keyboard typo prefix — positive
assert.ok(scoreEntityMatch("acala", "Scala") >= 70);
assert.equal(scoreEntityMatch("acala", "Scala"), 70);
assert.ok(scoreEntityMatch("scala", "Scala") >= 80);
assert.ok(filterListSelectSuggestions("acala", ["Scala", "Beta"]).includes("Scala"));
assert.equal(findBestFuzzyListOption("acala", ["Scala", "Beta", "Acqua"]), "Scala");

// Short query with one keyboard typo
assert.ok(scoreEntityMatch("ac", "Scala") >= 59 && scoreEntityMatch("ac", "Scala") <= 60);

// Keyboard typo prefix — negative
assert.equal(scoreEntityMatch("aaaa", "Scala"), 0);
assert.ok(scoreEntityMatch("qqqq", "Scala") <= 5);

console.log("global-entity-validation-search-fold.test.ts ok");
