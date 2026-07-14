import assert from "node:assert/strict";
import {
  buildTagliandoDueNotificationPayload,
  formatTagliandoDaEseguireBody,
} from "@/lib/maintenance-plans/tagliando-due-notification-mapper";
import { tagliandoDaEseguireDedupKey } from "@/lib/notifications/notification-dedup-keys";

const evalResult = {
  attrezzaturaLabel: "Marca Modello",
  cliente: "Cliente Test",
  currentOre: 600,
  earliestOverdueOre: 500,
  overdueCount: 1,
};

const body = formatTagliandoDaEseguireBody(evalResult);
assert.match(body, /Marca Modello/);
assert.match(body, /500 h/);
assert.match(body, /600 h/);

const bodyMulti = formatTagliandoDaEseguireBody({ ...evalResult, overdueCount: 3 });
assert.match(bodyMulti, /Altri 2 tagliandi/);

const payload = buildTagliandoDueNotificationPayload({
  lavorazioneId: "lav-1",
  mezzoId: "m1",
  evalResult,
});
assert.equal(payload.type, "tagliando_da_eseguire");
assert.equal(payload.title, "Tagliando da eseguire");
assert.equal(payload.href, "/mezzi");
assert.equal(payload.entity_type, "lavorazioni");
assert.equal(payload.entity_id, "lav-1");
assert.equal(payload.dedup_key, tagliandoDaEseguireDedupKey("lav-1"));

console.log("tagliando-due-notification-mapper.test.ts OK");
