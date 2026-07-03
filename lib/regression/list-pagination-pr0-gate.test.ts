import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const v2Hook = read("lib/lavorazioni/use-lavorazioni-list-v2.ts");
assert.doesNotMatch(v2Hook, /invalidateQueries/, "R-12: no invalidate in V2 hook");
assert.match(
  v2Hook,
  /pages\.length > 0 \? pages\[pages\.length - 1\]\.pageInfo\.nextCursor : null/,
  "R-9: null-safe lastCursor",
);
assert.match(v2Hook, /\[pages\.length, lastCursor, query\.dataUpdatedAt\]/, "R-9: triple-signal memo");

const adapter = read("lib/lavorazioni/adapt-legacy-list-result.ts");
assert.doesNotMatch(adapter, /\.filter\(/, "R-10b: no filter in adapter");

const lavView = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");
assert.match(lavView, /needsChiuseFetch/, "needsChiuseFetch present");
assert.match(
  lavView,
  /enabled:\s*needsChiuseFetch/,
  "needsChiuseFetch wired to chiuseQuery enabled",
);
assert.doesNotMatch(lavView, /meta\.hasNextPage/, "R-13c: no meta.hasNextPage in view");
assert.match(lavView, /ServerListLoadMore/, "PR-3 server load-more wired");

const invalidateBatch = read("src/lib/react-query/invalidate-batch.ts");
assert.match(invalidateBatch, /invalidationJitterDelayMs/, "PR-6 invalidate jitter wired");

const transformDocs = read("docs/list-query-transforms.md");
assert.match(transformDocs, /Business filter/);

console.log("list-pagination-pr0-gate.test.ts OK");
