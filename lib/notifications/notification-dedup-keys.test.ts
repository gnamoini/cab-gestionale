import assert from "node:assert/strict";
import {
  adminDashboardTestDedupKey,
  dashboardPromemoriaReminderDedupKey,
  dipendentiPresenzeReminderDedupKey,
  fattureScaduteDigestDedupKey,
  lavorazioneCompletataDedupKey,
  lavorazioneCreatedDedupKey,
  lavorazioniRitardoDigestDedupKey,
  magazzinoSottoScortaDedupKey,
  preventivoApprovatoDedupKey,
} from "@/lib/notifications/notification-dedup-keys";

assert.equal(lavorazioneCreatedDedupKey("abc12345"), "lav:abc12345");
assert.ok(lavorazioneCreatedDedupKey("abc12345").length >= 8);
assert.equal(lavorazioneCompletataDedupKey("abc12345"), "lav:abc12345:done");
assert.equal(preventivoApprovatoDedupKey("p1"), "prev:p1:approved");
assert.equal(lavorazioniRitardoDigestDedupKey("2026-07-01"), "lav-late:2026-07-01");
assert.equal(fattureScaduteDigestDedupKey("2026-07-01"), "fatt-scad:2026-07-01");

assert.equal(magazzinoSottoScortaDedupKey("r1"), "mag:r1:crossing");
assert.equal(dipendentiPresenzeReminderDedupKey("2026-07-01"), "dip-pres:2026-07-01");
assert.equal(
  dashboardPromemoriaReminderDedupKey("p1", "2026-07-01"),
  "prom:p1:2026-07-01",
);

const testKey = adminDashboardTestDedupKey("user-uuid", 120_000);
assert.match(testKey, /^test:user-uuid:\d+$/);

console.log("notification-dedup-keys: ok");
