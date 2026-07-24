import assert from "node:assert/strict";
import {
  formatPermanenzaGiorniInteriLabel,
  permanenzaGiorniInteri,
  permanenzaGiorniTra,
} from "@/lib/lavorazioni/duration";

assert.equal(
  permanenzaGiorniInteri("2026-07-24T08:00:00.000Z", "2026-07-24T20:00:00.000Z"),
  1,
  "same calendar day = 1 day regardless of time",
);

assert.equal(
  permanenzaGiorniInteri("2026-07-24", "2026-07-24"),
  1,
  "ymd-only same day = 1 day",
);

assert.equal(
  permanenzaGiorniInteri("2026-07-24T08:00:00.000Z", "2026-07-26T08:00:00.000Z"),
  3,
  "three inclusive calendar days",
);

assert.equal(formatPermanenzaGiorniInteriLabel(1), "1 giorno");
assert.equal(formatPermanenzaGiorniInteriLabel(3), "3 giorni");
assert.equal(formatPermanenzaGiorniInteriLabel(0), "—");

const tra = permanenzaGiorniTra("2026-07-24T08:00:00.000Z", "2026-07-24T20:00:00.000Z");
assert.equal(tra.label, "1 giorno");
assert.equal(tra.num, 1);

console.log("duration.test.ts ok");
