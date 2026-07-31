import assert from "node:assert/strict";
import {
  formatLivelloCarburanteDisplay,
  LIVELLO_CARBURANTE_THUMB_SIZE,
  livelloCarburanteThumbCenterCss,
  livelloCarburanteThumbCenterPx,
  livelloCarburanteToStored,
  normalizeLivelloCarburanteStored,
  parseLivelloCarburantePercent,
  snapLivelloCarburantePercent,
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

assert.equal(snapLivelloCarburantePercent(48), 50);
assert.equal(snapLivelloCarburantePercent(52), 50);
assert.equal(snapLivelloCarburantePercent(63), 63);
assert.equal(snapLivelloCarburantePercent(3), 0);
assert.equal(snapLivelloCarburantePercent(97), 100);

assert.ok(livelloCarburanteThumbCenterCss(75).includes(LIVELLO_CARBURANTE_THUMB_SIZE));
const track = 400;
const thumb = 20;
assert.equal(livelloCarburanteThumbCenterPx(0, track, thumb), 10);
assert.equal(livelloCarburanteThumbCenterPx(25, track, thumb), 105);
assert.equal(livelloCarburanteThumbCenterPx(50, track, thumb), 200);
assert.equal(livelloCarburanteThumbCenterPx(75, track, thumb), 295);
assert.equal(livelloCarburanteThumbCenterPx(100, track, thumb), 390);

console.log("livello-carburante-value.test.ts OK");
