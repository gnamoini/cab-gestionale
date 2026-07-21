import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const view = fs.readFileSync(
  path.join(ROOT, "components/gestionale/magazzino/magazzino-view.tsx"),
  "utf8",
);
const invalidate = fs.readFileSync(
  path.join(ROOT, "src/lib/react-query/invalidate-related.ts"),
  "utf8",
);

assert.match(view, /invalidateAfterMagazzinoOrMovimenti/);
assert.match(invalidate, /health-score/);

console.log("magazzino-scorta-invalidation.test.ts OK");
