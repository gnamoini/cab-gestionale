import assert from "node:assert/strict";
import {
  resolveGestionaleListEffectiveWidth,
  resolveGestionaleListLayout,
  resolveGestionaleListViewportWidth,
  gestionaleListLayoutViewportMq,
} from "./use-gestionale-list-layout";

assert.equal(gestionaleListLayoutViewportMq("xl"), "(min-width: 1280px)");
assert.equal(gestionaleListLayoutViewportMq("lg"), "(min-width: 1024px)");
assert.equal(gestionaleListLayoutViewportMq("md"), "(min-width: 768px)");

// tier xl
assert.equal(resolveGestionaleListLayout("xl", 390, 390), "mobile");
assert.equal(resolveGestionaleListLayout("xl", 1279, 1200), "mobile");
assert.equal(resolveGestionaleListLayout("xl", 1440, 1100), "desktop");
assert.equal(resolveGestionaleListLayout("xl", 1440, 600), "mobile");

assert.equal(
  resolveGestionaleListEffectiveWidth(1200, { mainScrollWidth: 600, documentClientWidth: 1440 }),
  600,
);
assert.equal(
  resolveGestionaleListLayout(
    "xl",
    1440,
    resolveGestionaleListEffectiveWidth(1200, { mainScrollWidth: 600, documentClientWidth: 1440 }),
  ),
  "mobile",
);

// IDE preview: wide viewport + narrow container → mobile
assert.equal(resolveGestionaleListLayout("xl", 1440, 600), "mobile");
assert.equal(resolveGestionaleListLayout("xl", 1920, 800), "mobile");

// tier lg
assert.equal(resolveGestionaleListLayout("lg", 900, 900), "mobile");
assert.equal(resolveGestionaleListLayout("lg", 1100, 1000), "desktop");
assert.equal(resolveGestionaleListLayout("lg", 1440, 800), "mobile");

// tier md
assert.equal(resolveGestionaleListLayout("md", 600, 600), "mobile");
assert.equal(resolveGestionaleListLayout("md", 900, 700), "desktop");
assert.equal(resolveGestionaleListLayout("md", 900, 600), "mobile");

// viewport helper returns 0 outside browser
assert.equal(resolveGestionaleListViewportWidth(), 0);

console.log("use-gestionale-list-layout.test.ts OK");
