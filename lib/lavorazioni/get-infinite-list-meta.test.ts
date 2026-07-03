import assert from "node:assert/strict";
import { getInfiniteListMeta } from "@/lib/lavorazioni/get-infinite-list-meta";
import type { Page } from "@/lib/domain/list-types";

type Row = { id: string };

const page = (ids: string[], hasNext: boolean): Page<Row> => ({
  rows: ids.map((id) => ({ id })),
  pageInfo: { hasNextPage: hasNext, nextCursor: hasNext ? { id: "c", created_at: "2026-01-01" } : null, totalEstimate: ids.length },
});

const meta = getInfiniteListMeta({
  data: { pages: [page(["a", "b"], true), page(["c"], false)], pageParams: [null, {}] },
  hasNextPage: false,
  isFetchingNextPage: false,
  dataUpdatedAt: 42,
  status: "success",
});

assert.equal(meta.pagesCount, 2);
assert.equal(meta.rowCount, 3);
assert.equal(meta.hasNextPage, false);
assert.equal(meta.dataUpdatedAt, 42);

console.log("get-infinite-list-meta.test.ts OK");
