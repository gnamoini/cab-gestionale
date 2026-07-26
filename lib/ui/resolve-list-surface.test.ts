import assert from "node:assert/strict";
import {
  resolveListSurfaceForViewportWidth,
  resolveListSurfaceFromRequest,
  parseViewportWidthClientHint,
} from "./resolve-list-surface";

assert.equal(resolveListSurfaceFromRequest({}), "table");
assert.equal(resolveListSurfaceFromRequest({ cookieValue: "cards" }), "cards");
assert.equal(resolveListSurfaceFromRequest({ cookieValue: "table" }), "table");
assert.equal(resolveListSurfaceFromRequest({ cookieValue: "invalid" }), "table");
assert.equal(resolveListSurfaceFromRequest({ viewportWidthHint: 1279 }), "cards");
assert.equal(resolveListSurfaceFromRequest({ viewportWidthHint: 1280 }), "table");
assert.equal(
  resolveListSurfaceFromRequest({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" }),
  "cards",
);
assert.equal(resolveListSurfaceFromRequest({ cookieValue: "table", viewportWidthHint: 390 }), "table");

assert.equal(parseViewportWidthClientHint("1440"), 1440);
assert.equal(parseViewportWidthClientHint(""), null);

assert.equal(resolveListSurfaceForViewportWidth(1440), "table");
assert.equal(resolveListSurfaceForViewportWidth(390), "cards");

console.log("resolve-list-surface.test.ts OK");
