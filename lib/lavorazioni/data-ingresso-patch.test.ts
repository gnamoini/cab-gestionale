import assert from "node:assert/strict";
import {
  resolveDataIngressoWriteValue,
  ymdFromLavorazioneDataIngresso,
} from "@/lib/lavorazioni/data-ingresso-patch";

assert.equal(ymdFromLavorazioneDataIngresso("2026-06-01"), "2026-06-01");
assert.equal(ymdFromLavorazioneDataIngresso("2026-06-01T10:00:00.000Z"), "2026-06-01");

const sameDay = resolveDataIngressoWriteValue("2026-06-01", "01/06/2026");
assert.equal(sameDay.changed, false);
assert.equal(sameDay.value, "2026-06-01");
assert.equal(sameDay.displayCanonical, "01/06/2026");

const sameDayIso = resolveDataIngressoWriteValue("2026-06-01T10:00:00.000Z", "01/06/2026");
assert.equal(sameDayIso.changed, false);

const changed = resolveDataIngressoWriteValue("2026-06-01", "02/06/2026");
assert.equal(changed.changed, true);
assert.equal(changed.value, "2026-06-02");
assert.equal(changed.displayCanonical, "02/06/2026");

const empty = resolveDataIngressoWriteValue(null, "");
assert.equal(empty.changed, false);
assert.equal(empty.value, null);

console.log("data-ingresso-patch.test.ts: ok");
