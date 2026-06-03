/**
 * UI OS Engine — policy tests.
 */
import assert from "node:assert/strict";
import {
  computeDriftScore,
  detectUIContractViolations,
  UI_OS_OPT_IN_PAGES,
  validateUISchema,
} from "@/lib/ui-os/ui-os-engine";
import { buildShadowReport } from "@/lib/ui-os/ui-os-engine";
import { DEFAULT_PAGE_SCHEMA, getSuggestedSchema } from "@/lib/ui-os/ui-schema";
import { diffSchemas, schemaMatchScore } from "@/lib/ui-os/ui-migration-layer";

const valid = validateUISchema(DEFAULT_PAGE_SCHEMA);
assert.equal(valid.valid, true);
assert.equal(valid.errors.length, 0);

const bad = validateUISchema({ toolbar: "invalid" as "standard" });
assert.equal(bad.valid, false);

const violations = detectUIContractViolations({
  toolbar: "standard",
  table: "legacy",
});
assert.ok(violations.some((v) => v.includes("legacy table")));

assert.equal(schemaMatchScore(
  { toolbar: "standard", table: "global" },
  { toolbar: "standard", table: "global" },
), 100);

assert.equal(diffSchemas(
  { toolbar: "legacy" },
  { toolbar: "standard" },
).length, 1);

const drift = computeDriftScore(80, { toolbar: "standard" }, { toolbar: "standard" });
assert.ok(drift >= 48 && drift <= 100);

const ssr = buildShadowReport("/report", null);
assert.equal(ssr.driftScore, 100);
assert.equal(ssr.page, "/report");

assert.ok(getSuggestedSchema("/lavorazioni").table === "global");
assert.ok(getSuggestedSchema("/report").layout === "report-dashboard");

assert.equal(typeof UI_OS_OPT_IN_PAGES, "object");
assert.equal(UI_OS_OPT_IN_PAGES["/lavorazioni"], "os", "Phase 2: lavorazioni opt-in");
assert.equal(UI_OS_OPT_IN_PAGES["/report"], "os", "Phase 2: report opt-in");

console.log("ui-os-engine.test.ts OK");
