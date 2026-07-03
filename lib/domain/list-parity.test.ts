import assert from "node:assert/strict";
import { normalizeLavorazioniFilters } from "@/lib/domain/normalize-filters";
import { toQueryParams } from "@/lib/domain/to-query-params";

/** S4a-style fixture — canonical compare shape for parity gate (PR-1). */
const FIXTURE_FILTERS = { archived: false as const, search: "test", stato: "aperta" as never };

const norm = normalizeLavorazioniFilters(FIXTURE_FILTERS);
const params = toQueryParams(norm);

assert.equal(params.mode, "active");
assert.equal(params.search, "test");
assert.equal(params.stato, "aperta");
assert.equal(params.limit, 100);
assert.equal(params.cursor_created_at, null);
assert.equal(params.cursor_id, null);

assert.deepEqual(Object.keys(params).sort(), [
  "cursor_created_at",
  "cursor_id",
  "limit",
  "mode",
  "search",
  "stato",
]);

console.log("list-parity.test.ts OK");
