/**
 * MAP — migration wave ordering invariants.
 */
import assert from "node:assert/strict";
import type { MigrationRiskProfile } from "@/lib/form-ux-migration/form-ux-migration-classifier";
import { buildMigrationWaves } from "@/lib/form-ux-migration/form-ux-migration-queue";

function profile(partial: Partial<MigrationRiskProfile> & { fieldKey: string; tier: 0 | 1 | 2 | 3 }): MigrationRiskProfile {
  const labels = ["safe", "moderate", "high", "critical"] as const;
  const tierBand =
    partial.tierBand ??
    (partial.tier === 0 ? "0" : (`${partial.tier}` as MigrationRiskProfile["tierBand"]));
  return {
    formId: "ricambio",
    fieldId: partial.fieldKey.split(".").pop() ?? partial.fieldKey,
    tierLabel: labels[partial.tier],
    tierBand,
    signals: [],
    hardSignals: [],
    softSignals: [],
    tier0ConfidenceScore: partial.tier === 0 ? 1 : 0.5,
    recalibrationReasons: [],
    isRecalibratedTier0: tierBand === "0B",
    codemodDisposition: "REVIEW_REQUIRED",
    suggestedInitialMode: "shadow",
    suggestedEnforcement: "warn",
    status: "legacy",
    file: "components/test.tsx",
    line: 1,
    kind: "text",
    mapVersion: 1,
    classifierSchemaVersion: "v1",
    ...partial,
  };
}

const waves = buildMigrationWaves([
  profile({ fieldKey: "ricambio.a", tier: 2 }),
  profile({ fieldKey: "ricambio.b", tier: 0 }),
  profile({ fieldKey: "lavorazioni.c", tier: 1, formId: "lavorazioni", file: "components/lavorazioni/x.tsx" }),
  profile({ fieldKey: "ricambio.d", tier: 0, status: "ssot" }),
]);

assert.equal(waves.length, 3);
assert.equal(waves[0]!.tier, 0);
assert.equal(waves[0]!.fieldCount, 1);
assert.equal(waves[1]!.tier, 1);
assert.equal(waves[2]!.tier, 2);
assert.ok(waves[0]!.estimatedDays >= 1);

console.log("map-queue.test.ts OK");
