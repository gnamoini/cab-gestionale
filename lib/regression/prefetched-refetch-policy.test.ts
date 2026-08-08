import assert from "node:assert/strict";
import {
  markPrefetchedQueryMeta,
  shouldSkipMountRefetchForPrefetchedQuery,
} from "@/lib/react-query/prefetched-query-meta";

const navStart = Date.now() - 50;
const prefetchedAt = navStart + 10;
const meta = markPrefetchedQueryMeta(prefetchedAt);

assert.equal(
  shouldSkipMountRefetchForPrefetchedQuery(meta, prefetchedAt, 30_000, navStart),
  true,
  "fresh prefetched in same navigation window",
);

assert.equal(
  shouldSkipMountRefetchForPrefetchedQuery(meta, navStart - 60_000, 30_000, navStart),
  false,
  "stale prefetched from prior navigation",
);

assert.equal(
  shouldSkipMountRefetchForPrefetchedQuery(undefined, prefetchedAt, 30_000),
  false,
  "no meta → normal refetch policy",
);

console.log("prefetched-refetch-policy.test.ts OK");
