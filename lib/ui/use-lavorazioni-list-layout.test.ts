import assert from "node:assert/strict";
import {
  LAVORAZIONI_LIST_DESKTOP_MIN_CONTAINER,
  LAVORAZIONI_LIST_DESKTOP_MIN_VIEWPORT,
  resolveLavorazioniListLayout,
} from "./use-lavorazioni-list-layout";

assert.equal(LAVORAZIONI_LIST_DESKTOP_MIN_VIEWPORT, 1280);
assert.equal(LAVORAZIONI_LIST_DESKTOP_MIN_CONTAINER, 1024);

assert.equal(resolveLavorazioniListLayout(390, 390), "mobile", "phone viewport");
assert.equal(resolveLavorazioniListLayout(1279, 1200), "mobile", "viewport sotto xl");
assert.equal(resolveLavorazioniListLayout(1440, 1100), "desktop", "laptop con sidebar");
assert.equal(resolveLavorazioniListLayout(1920, 1600), "desktop", "desktop full width");
assert.equal(resolveLavorazioniListLayout(1440, 600), "mobile", "preview IDE stretto");
assert.equal(resolveLavorazioniListLayout(1440, 1023), "mobile", "container sotto soglia");

console.log("use-lavorazioni-list-layout.test.ts OK");
