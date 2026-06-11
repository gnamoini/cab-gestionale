/**
 * MAP drift detector — score and trend from synthetic snapshots.
 */
import assert from "node:assert/strict";
import { classifyMigrationField } from "@/lib/form-ux-migration/form-ux-migration-classifier";
import type { MigrationInventoryField } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import {
  computeDriftScore,
  type ClassifierSnapshotFile,
} from "@/lib/form-ux-migration/form-ux-tier-drift-detector";

function field(partial: Partial<MigrationInventoryField> & Pick<MigrationInventoryField, "fieldKey" | "fieldId">): MigrationInventoryField {
  return {
    formId: "settings",
    file: "components/settings/form.tsx",
    line: 10,
    kind: "text",
    snippet: '<input type="text" onChange={setX} />',
    status: "legacy",
    staticallyMigrated: false,
    source: "scan",
    ...partial,
  };
}

const f = field({ fieldKey: "settings.label", fieldId: "label" });
const profile = classifyMigrationField(f);

const noPrior = computeDriftScore({
  current: profile,
  contractPenalty: 0,
});
assert.equal(noPrior.hasPriorSnapshot, false);
assert.equal(noPrior.score, 0);

const priorSnapshots: ClassifierSnapshotFile[] = [
  {
    capturedAt: "2026-01-01T00:00:00.000Z",
    fields: [
      {
        fieldKey: "settings.label",
        tierBand: "0B",
        signals: ["onChange_controlled"],
        tier0ConfidenceScore: 0.88,
        capturedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  },
];

const withPrior = computeDriftScore({
  current: profile,
  prior: priorSnapshots[0]!.fields[0],
  contractPenalty: 0,
});
assert.equal(withPrior.hasPriorSnapshot, true);
assert.ok(withPrior.score >= 0);

const worsened = computeDriftScore({
  current: { ...profile, tierBand: "1" },
  prior: priorSnapshots[0]!.fields[0],
  contractPenalty: 0,
});
assert.ok(worsened.tierBandWorsened);
assert.ok(worsened.score > withPrior.score);

console.log("map-tier-drift-detector.test.ts OK");
