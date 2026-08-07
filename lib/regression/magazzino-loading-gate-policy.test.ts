/**
 * Policy — magazzino list loading gate must use raw query, not UI-mapped hook.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const view = fs.readFileSync(
  path.join(process.cwd(), "components/gestionale/magazzino/magazzino-view.tsx"),
  "utf8",
);

assert.match(view, /useMagazzinoListQuery\(magazzinoFetchFilters\)/);
assert.match(view, /rawMagazzinoListQ\.isLoading && rawMagazzinoListQ\.data === undefined/);
assert.doesNotMatch(
  view,
  /magazzinoListQ\.isLoading && magazzinoListQ\.data === undefined/,
);

console.log("magazzino-loading-gate-policy.test.ts OK");
