import assert from "node:assert/strict";
import { getRuntimeHealthSnapshot } from "@/lib/observability/runtime-health";
import { logMezzoSchedaConflictTelemetry } from "@/lib/domain/mezzo/mezzo-scheda-conflict-telemetry";

function run() {
  logMezzoSchedaConflictTelemetry({
    event: "MEZZO_UPDATE_CONFIRMED",
    mezzoId: "m-test",
    choice: "update_mezzo",
  });
  const snap = getRuntimeHealthSnapshot();
  assert.ok(snap.counters.MEZZO_UPDATE_CONFIRMED >= 1);
  assert.ok(snap.counters.MEZZO_UPDATE_CONFIRMED_update_mezzo >= 1);
  console.log("mezzo-scheda-conflict-telemetry.test.ts OK");
}

run();
