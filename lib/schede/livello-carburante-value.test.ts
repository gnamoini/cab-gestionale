import assert from "node:assert/strict";
import {
  formatLivelloCarburanteDisplay,
  livelloCarburanteToStored,
  normalizeLivelloCarburanteStored,
  parseLivelloCarburantePercent,
} from "@/lib/schede/livello-carburante-value";

assert.equal(parseLivelloCarburantePercent(""), null);
assert.equal(parseLivelloCarburantePercent("Vuoto"), 0);
assert.equal(parseLivelloCarburantePercent("1/2"), 50);
assert.equal(parseLivelloCarburantePercent("3/4"), 75);
assert.equal(parseLivelloCarburantePercent("47"), 47);
assert.equal(parseLivelloCarburantePercent("47%"), 47);
assert.equal(parseLivelloCarburantePercent("150"), null);

assert.equal(livelloCarburanteToStored(47.6), "48%");
assert.equal(normalizeLivelloCarburanteStored("3/4"), "75%");
assert.equal(normalizeLivelloCarburanteStored("43"), "43%");
assert.equal(normalizeLivelloCarburanteStored("43%"), "43%");
assert.equal(normalizeLivelloCarburanteStored(""), "");
assert.equal(formatLivelloCarburanteDisplay("3/4"), "75%");
assert.equal(formatLivelloCarburanteDisplay("63%"), "63%");
assert.equal(formatLivelloCarburanteDisplay(""), "");

console.log("livello-carburante-value.test.ts OK");
