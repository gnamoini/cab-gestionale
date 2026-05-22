import assert from "node:assert/strict";
import {
  gestionaleDispatchFingerprint,
  cabSyncEventForEntity,
} from "@/lib/sync/gestionale-sync-dispatch";
import { cabSyncEventFromPostgresChange } from "@/lib/sync/cab-sync-bus";

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

console.log("gestionale-sync-dispatch.test.ts: ok");
