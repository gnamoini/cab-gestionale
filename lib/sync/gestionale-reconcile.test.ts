import assert from "node:assert/strict";
import { reconcileGestionaleEntity } from "@/lib/sync/gestionale-reconcile";
import { markRecentLocalGestionaleMutation, clearRecentLocalGestionaleMutations } from "@/lib/sync/recent-local-mutation";

const noopQc = {
  invalidateQueries: () => undefined,
} as unknown as import("@tanstack/react-query").QueryClient;

clearRecentLocalGestionaleMutations();
const r1 = reconcileGestionaleEntity(
  noopQc,
  { type: "entity_updated", entity: "magazzino_ricambi", id: "ric-1", table: "magazzino_ricambi" },
  "cab_sync",
);
assert.equal(r1.handled, true);

markRecentLocalGestionaleMutation(["magazzino_ricambi"], "ric-1");
const r2 = reconcileGestionaleEntity(
  noopQc,
  { type: "entity_updated", entity: "magazzino_ricambi", id: "ric-1", table: "magazzino_ricambi" },
  "realtime",
);
assert.equal(r2.needsRefetch, false);

const r3 = reconcileGestionaleEntity(
  noopQc,
  { type: "entity_updated", entity: "scheda_lavorazione", id: "sch-1", table: "scheda_lavorazione" },
  "cab_sync",
  { skipInvalidation: true },
);
assert.equal(r3.needsRefetch, true);

console.log("gestionale-reconcile.test.ts: ok");
