import assert from "node:assert/strict";
import { resolveSelectorSurface } from "@/lib/selector-core/resolve-selector-surface";

assert.equal(
  resolveSelectorSurface({
    isMobile: true,
    optionCount: 20,
    selectOnly: true,
    selectorDomain: "addetti",
  }),
  "dropdown",
  "20 opzioni non supera soglia sheet (>20)",
);

assert.equal(
  resolveSelectorSurface({
    isMobile: true,
    optionCount: 21,
    selectOnly: true,
    selectorDomain: "addetti",
  }),
  "sheet",
);

assert.equal(
  resolveSelectorSurface({
    isMobile: true,
    optionCount: 25,
    selectOnly: true,
    selectorDomain: "report",
  }),
  "dropdown",
  "report domain DISABLED for sheet",
);

assert.equal(
  resolveSelectorSurface({
    isMobile: true,
    optionCount: 25,
    selectOnly: false,
    mobileSheetMode: "searchable",
    selectorDomain: "mezzi",
  }),
  "sheet",
);

assert.equal(
  resolveSelectorSurface({
    isMobile: false,
    optionCount: 100,
    selectOnly: true,
    selectorDomain: "addetti",
  }),
  "dropdown",
);

console.log("resolve-selector-surface.test.ts OK");
