import assert from "node:assert/strict";
import {
  RECENT_ENTITY_MS,
  clearRecentLocalGestionaleMutations,
  markRecentLocalGestionaleMutation,
  markRecentLocalGestionaleMutationAt,
  shouldSuppressRemoteCacheInvalidation,
} from "@/lib/sync/recent-local-mutation";

clearRecentLocalGestionaleMutations();

markRecentLocalGestionaleMutation(["mezzi"], "mezzo-a");
assert.equal(
  shouldSuppressRemoteCacheInvalidation("mezzi"),
  true,
  "table-level suppress when entity recent within window",
);
assert.equal(
  shouldSuppressRemoteCacheInvalidation("mezzi", "mezzo-a"),
  true,
  "entity-level suppress still works",
);

clearRecentLocalGestionaleMutations();
const expiredAt = Date.now() - RECENT_ENTITY_MS - 1_000;
markRecentLocalGestionaleMutationAt(["mezzi"], "mezzo-b", expiredAt);
assert.equal(
  shouldSuppressRemoteCacheInvalidation("mezzi"),
  false,
  "table-level must not suppress after RECENT_ENTITY_MS",
);
assert.equal(
  shouldSuppressRemoteCacheInvalidation("mezzi", "mezzo-b"),
  false,
  "entity-level must not suppress after RECENT_ENTITY_MS",
);

clearRecentLocalGestionaleMutations();
console.log("recent-local-mutation-table-level.test.ts OK");
