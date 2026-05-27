import assert from "node:assert/strict";
import {
  gestionaleDispatchFingerprint,
  cabSyncEventForEntity,
  cabSyncEventNotificaKey,
  shouldDispatchNotificaForCabEvent,
  GESTIONALE_DISPATCH_DEDUP_MS,
  getLastGestionaleDispatchAt,
} from "@/lib/sync/gestionale-sync-dispatch";
import { cabSyncEventFromPostgresChange, type CabSyncEvent } from "@/lib/sync/cab-sync-bus";

const fp1 = gestionaleDispatchFingerprint(["lavorazioni"], [
  cabSyncEventForEntity("lavorazioni", "abc", "entity_created", "lavorazioni"),
]);
const fp2 = gestionaleDispatchFingerprint(["lavorazioni"], [
  cabSyncEventForEntity("lavorazioni", "abc", "entity_created", "lavorazioni"),
]);
assert.equal(fp1, fp2);

const fp3 = gestionaleDispatchFingerprint(["lavorazioni", "documenti"]);
assert.notEqual(fp1, fp3);

const created = cabSyncEventFromPostgresChange("lavorazioni", {
  eventType: "INSERT",
  new: { id: "lav-1" },
});
assert.ok(created);
assert.equal(created?.type, "entity_created");
assert.equal(created?.entity, "lavorazioni");
assert.equal(created?.id, "lav-1");

const deleted = cabSyncEventFromPostgresChange("scheda_lavorazione", {
  eventType: "DELETE",
  old: { id: "sch-9" },
});
assert.equal(deleted?.type, "entity_deleted");

const unknown = cabSyncEventFromPostgresChange("unknown_table", {
  eventType: "UPDATE",
  new: { id: "x" },
});
assert.equal(unknown, null);

assert.equal(GESTIONALE_DISPATCH_DEDUP_MS, 5000);
assert.equal(typeof getLastGestionaleDispatchAt(), "number");

const magEv = cabSyncEventForEntity("magazzino_ricambi", "ric-1", "entity_updated", "magazzino_ricambi");
const lavSyn: CabSyncEvent = { type: "entity_updated", entity: "lavorazioni", id: "", table: "lavorazioni" };
assert.ok(magEv);
assert.equal(
  shouldDispatchNotificaForCabEvent(lavSyn, [magEv]),
  false,
  "evento sintetico lavorazioni non deve notificare se esplicito solo magazzino",
);
assert.equal(shouldDispatchNotificaForCabEvent(magEv, [magEv]), true);
assert.equal(cabSyncEventNotificaKey(magEv), "magazzino_ricambi:entity_updated:ric-1");

console.log("gestionale-sync-dispatch.test.ts: ok");
