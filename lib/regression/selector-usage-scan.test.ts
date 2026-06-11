/**
 * Usage scan baseline + migration guardrail tests.
 */
import assert from "node:assert/strict";
import {
  runSelectorUsageScan,
  SELECTOR_MIGRATION_MAX_COMPONENTS_PER_PR,
  assertMigrationGuardrail,
} from "@/lib/selector-core/selector-usage-scan";

const report = runSelectorUsageScan();

assert.ok(report.scannedAt);
assert.ok(Array.isArray(report.legacy));
assert.ok(Array.isArray(report.operationalSelectOnly));
assert.ok(Array.isArray(report.addettiPill));

const addettiPillCritical = report.addettiPill.filter(
  (t) => t.file.includes("lavorazioni-view") && t.importCount > 0,
);
assert.equal(
  addettiPillCritical.length,
  0,
  "lavorazioni-view non deve usare pill addetti post-refactor",
);

const operationalViolations = report.operationalSelectOnly.filter((t) => t.importCount > 0);
assert.equal(
  operationalViolations.length,
  0,
  `selectOnly operativo residuo: ${operationalViolations.map((v) => v.id).join(", ")}`,
);

assert.doesNotThrow(() => assertMigrationGuardrail(["a", "b"]));
assert.throws(() => assertMigrationGuardrail(Array.from({ length: 6 }, (_, i) => `c${i}`)));

assert.equal(SELECTOR_MIGRATION_MAX_COMPONENTS_PER_PR, 5);

console.log("selector-usage-scan.test.ts OK", {
  critical: report.summary.critical,
  medium: report.summary.medium,
});
