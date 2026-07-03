import assert from "node:assert/strict";
import { normalizeLavorazioniFilters } from "@/lib/domain/normalize-filters";
import { toQueryParams } from "@/lib/domain/to-query-params";

const norm = normalizeLavorazioniFilters({
  archived: false,
  search: "  foo  ",
  stato: "aperta" as never,
});

assert.equal(norm.mode, "active");
assert.equal(norm.search, "foo");
assert.equal(norm.stato, "aperta");
assert.equal(norm.cursorCreatedAt, null);
assert.equal(norm.cursorId, null);
assert.equal(norm.limit, 100);

const closed = normalizeLavorazioniFilters({ archived: true });
assert.equal(closed.mode, "closed");

const params = toQueryParams(norm);
assert.deepEqual(params, {
  mode: "active",
  search: "foo",
  stato: "aperta",
  limit: 100,
  cursor_created_at: null,
  cursor_id: null,
});

const keys = Object.keys(norm);
assert.deepEqual(keys, [
  "mode",
  "search",
  "stato",
  "cursorCreatedAt",
  "cursorId",
  "limit",
]);

console.log("normalize-filters.test.ts OK");
