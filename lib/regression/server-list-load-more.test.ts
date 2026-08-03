import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(
  resolve(import.meta.dirname, "../../components/gestionale/server-list-load-more.tsx"),
  "utf8",
);

assert.match(src, /loadedCount/);
assert.match(src, /totalCount/);
assert.match(src, /rimanenti/);
assert.match(src, /tutte caricate/);
assert.match(src, /pageSizeThreshold/);
assert.match(src, /shouldShowLoadMoreFooter/);

console.log("server-list-load-more.test.ts OK");
