import assert from "node:assert/strict";
import { toLavorazioniPageFromRpc } from "@/lib/domain/list-mapper";

const page = toLavorazioniPageFromRpc(
  {
    rows: [{ id: "a", stato: "aperta", created_at: "2026-01-01T00:00:00Z" }],
    next_cursor: { created_at: "2026-01-01T00:00:00Z", id: "a" },
    total_estimate: null,
  },
  { includeMezzo: false, limit: 100 },
);

assert.equal(page.rows.length, 1);
assert.equal(page.pageInfo.hasNextPage, true);
assert.ok(page.pageInfo.nextCursor);

const last = toLavorazioniPageFromRpc(
  { rows: [], next_cursor: null, total_estimate: null },
  { includeMezzo: false, limit: 100 },
);
assert.equal(last.pageInfo.hasNextPage, false);

console.log("list-mapper.test.ts OK");
