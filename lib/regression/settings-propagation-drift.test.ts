import assert from "node:assert/strict";
import { scanPropagationDrift, buildPropagationDriftCabEvent } from "@/lib/settings/propagation-drift-detector";

const drift = scanPropagationDrift({
  kind: "utilizzatore",
  catalogLabels: ["AMIU Trani"],
  operationalValues: ["AMIU Trani SPA", "AMIU Trani"],
  pendingJobs: [
    {
      id: "job-1",
      kind: "utilizzatore",
      old_label: "AMIU Trani SPA",
      new_label: "AMIU Trani",
      propagation_status: "configuration_only",
    } as never,
  ],
});

assert.equal(drift.length, 1);
assert.equal(drift[0]?.oldLabel, "AMIU Trani SPA");
assert.equal(drift[0]?.affectedCount, 1);

const event = buildPropagationDriftCabEvent(drift[0]!);
assert.equal(event.type, "SETTINGS_PROPAGATION_DRIFT_DETECTED");
assert.equal(event.affectedCount, 1);

console.log("settings-propagation-drift.test.ts OK");
