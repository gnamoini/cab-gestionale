import assert from "node:assert/strict";
import { isValidLavorazioniRpcListCursor, toLavorazioniPageFromRpc } from "@/lib/domain/list-mapper";

const page = toLavorazioniPageFromRpc(
  {
    rows: [{ id: "a", stato: "aperta", created_at: "2026-01-01T00:00:00Z" }],
    next_cursor: { created_at: "2026-01-01T00:00:00Z", id: "a" },
    total_estimate: null,
  },
  { includeMezzo: false, limit: 100 },
);

assert.equal(page.rows.length, 1);
assert.equal(page.pageInfo.hasNextPage, false, "partial page must not advertise next");
assert.equal(page.pageInfo.nextCursor, null);

assert.equal(isValidLavorazioniRpcListCursor({ created_at: "x", id: "" }), false);
assert.equal(isValidLavorazioniRpcListCursor({ created_at: "", id: "a" }), false);

const full = toLavorazioniPageFromRpc(
  {
    rows: Array.from({ length: 100 }, (_, i) => ({
      id: `id-${i}`,
      stato: "aperta",
      created_at: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
    })),
    next_cursor: { created_at: "2026-01-01T00:00:00Z", id: "id-0" },
    total_estimate: null,
  },
  { includeMezzo: false, limit: 100 },
);
assert.equal(full.pageInfo.hasNextPage, true);
assert.ok(full.pageInfo.nextCursor);

const last = toLavorazioniPageFromRpc(
  { rows: [], next_cursor: null, total_estimate: null },
  { includeMezzo: false, limit: 100 },
);
assert.equal(last.pageInfo.hasNextPage, false);

console.log("list-mapper.test.ts OK");
