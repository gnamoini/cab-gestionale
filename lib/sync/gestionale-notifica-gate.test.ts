import assert from "node:assert/strict";
import type { CabSyncEvent } from "@/lib/sync/cab-sync-bus";
import {
  cabSyncEventNotificaKey,
  shouldDispatchNotificaForCabEvent,
  shouldDispatchNotificaForGestionaleAction,
} from "@/lib/sync/gestionale-notifica-gate";
import {
  clearRecentLocalGestionaleMutations,
  markRecentLocalGestionaleMutation,
  markRecentLocalTableBurst,
} from "@/lib/sync/recent-local-mutation";

const magEv: CabSyncEvent = {
  type: "entity_updated",
  entity: "magazzino_ricambi",
  id: "ric-1",
  table: "magazzino_ricambi",
};
const lavSyn: CabSyncEvent = { type: "entity_updated", entity: "lavorazioni", id: "", table: "lavorazioni" };
assert.ok(magEv);
assert.equal(
  shouldDispatchNotificaForCabEvent(lavSyn, [magEv]),
  false,
  "evento sintetico lavorazioni non deve notificare se esplicito solo magazzino",
);
assert.equal(shouldDispatchNotificaForCabEvent(magEv, [magEv]), true);
assert.equal(cabSyncEventNotificaKey(magEv), "magazzino_ricambi:entity_updated:ric-1");

const lavEv: CabSyncEvent = {
  type: "entity_updated",
  entity: "lavorazioni",
  id: "lav-1",
  table: "lavorazioni",
};
assert.ok(lavEv);

clearRecentLocalGestionaleMutations();

assert.equal(
  shouldDispatchNotificaForGestionaleAction(lavEv, [lavEv], "local_mutation"),
  false,
  "local_mutation non deve mostrare toast remoto",
);

assert.equal(
  shouldDispatchNotificaForGestionaleAction(lavEv, [lavEv], "realtime"),
  true,
  "realtime senza mark deve notificare",
);

assert.equal(
  shouldDispatchNotificaForGestionaleAction(lavEv, [lavEv], "broadcast"),
  true,
  "broadcast altra tab deve ancora notificare",
);

markRecentLocalGestionaleMutation(["lavorazioni"], "lav-1");
assert.equal(
  shouldDispatchNotificaForGestionaleAction(lavEv, [lavEv], "realtime"),
  false,
  "realtime con mark entità deve sopprimere toast",
);

clearRecentLocalGestionaleMutations();
markRecentLocalTableBurst(["scheda_lavorazione"]);
const schedaEv: CabSyncEvent = {
  type: "entity_updated",
  entity: "scheda_lavorazione",
  id: "",
  table: "scheda_lavorazione",
};
assert.equal(
  shouldDispatchNotificaForGestionaleAction(schedaEv, [schedaEv], "realtime"),
  false,
  "table burst deve sopprimere toast scheda senza id",
);

console.log("gestionale-notifica-gate.test.ts: ok");
