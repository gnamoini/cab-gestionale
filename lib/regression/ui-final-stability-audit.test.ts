/**
 * UI Final Stability Audit — governance layer + score freeze invariants.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { FLEX_SYSTEM_ABSOLUTE_FINAL_STATE } from "@/lib/ui/flex-system-freeze";
import {
  UI_ROUTE_AUDIT_KEYS,
  countGlobalNewFlexViolations,
} from "@/lib/ui/ui-route-reliability-audit";
import {
  auditAllUiFinalStability,
  auditUiFinalStability,
  computeGlobalUiFinalHealth,
  formatUiFinalStabilityAudit,
  formatUiFinalStabilityTable,
  formatUiFinalSystemHealth,
  getBaselineRisksForRoute,
} from "@/lib/ui/ui-final-stability-audit";
import {
  UI_FINAL_STABILITY_MANIFEST_PATH,
  buildUiFinalStabilityManifest,
  verifyUiFinalStabilityManifest,
  type UiFinalStabilityManifest,
} from "@/lib/ui/ui-final-stability-manifest";

const ROOT = process.cwd();

assert.equal(FLEX_SYSTEM_ABSOLUTE_FINAL_STATE, true);
assert.equal(countGlobalNewFlexViolations(), 0, "no new flex violations globally");

const reports = auditAllUiFinalStability();
assert.equal(reports.length, 6);

for (const route of UI_ROUTE_AUDIT_KEYS) {
  const report = auditUiFinalStability(route);
  assert.equal(report.route, route);
  assert.ok(report.scores.flexSafety >= 0 && report.scores.flexSafety <= 100);
  assert.ok(report.scores.overall >= 0 && report.scores.overall <= 100);
  assert.ok(["OK", "WARNING", "DEGRADED", "AT_RISK"].includes(report.status));
}

const lavorazioni = reports.find((r) => r.route === "/lavorazioni");
const dipendenti = reports.find((r) => r.route === "/dipendenti");
const dashboard = reports.find((r) => r.route === "/dashboard");
assert.ok(lavorazioni);
assert.ok(dipendenti);
assert.ok(dashboard);

assert.equal(lavorazioni!.scores.uiOsCompatibility, 100);
assert.equal(lavorazioni!.status, "OK");
assert.equal(dipendenti!.status, "DEGRADED");
assert.equal(dipendenti!.scores.uiOsCompatibility, 70);

assert.equal(reports.reduce((sum, r) => sum + r.issues.newFlexRisks.length, 0), 0);

const pageHeaderBaseline = getBaselineRisksForRoute("/report").find((r) => r.id === "page-header");
assert.ok(pageHeaderBaseline);
assert.equal(pageHeaderBaseline!.baselineEntryCount, 1);

const dashboardBaseline = getBaselineRisksForRoute("/dashboard");
assert.ok(dashboardBaseline.some((r) => r.id === "sistema-impostazioni-modal"));

const health = computeGlobalUiFinalHealth(reports);
assert.equal(health.globalFlexStability, 100);
assert.notEqual(health.recommendation, "AT RISK");

const table = formatUiFinalStabilityTable(reports);
assert.match(table, /\| Route \| Flex \| Overflow \| UI OS \| Layout \| Overall \| Status \|/);
assert.match(table, /\/lavorazioni/);

const healthBlock = formatUiFinalSystemHealth(health);
assert.match(healthBlock, /Global Flex Stability Score:/);
assert.match(healthBlock, /Global UI OS Health Score:/);
assert.match(healthBlock, /Global Overflow Risk Score:/);
assert.match(healthBlock, /System-wide Layout Drift Score:/);
assert.match(healthBlock, /Final Recommendation:/);

const fullAudit = formatUiFinalStabilityAudit(reports, health);
assert.match(fullAudit, /Global Flex Stability Score:/);

const manifestPath = path.join(ROOT, UI_FINAL_STABILITY_MANIFEST_PATH);
assert.ok(fs.existsSync(manifestPath), `${UI_FINAL_STABILITY_MANIFEST_PATH} must exist`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as UiFinalStabilityManifest;
assert.equal(manifest.absoluteFinalState, true);

const verification = verifyUiFinalStabilityManifest(manifest, reports);
assert.equal(verification.valid, true, verification.errors.join("; "));

const expected = buildUiFinalStabilityManifest(reports);
assert.equal(manifest.checksum, expected.checksum);

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
assert.ok(pkg.scripts["ui:final-stability:audit"]);
assert.ok(pkg.scripts["ui:final-stability:manifest:generate"]);

console.log("ui-final-stability-audit.test.ts OK");
