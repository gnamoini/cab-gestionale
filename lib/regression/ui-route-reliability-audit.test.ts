/**
 * Route-level UI reliability audit — flex safety + heuristics + scores.
 */
import assert from "node:assert/strict";
import {
  UI_ROUTE_AUDIT_KEYS,
  auditAllTargetRoutes,
  auditRouteReliability,
  computeFlexStabilityScore,
  computeUiReliabilityScores,
  countGlobalNewFlexViolations,
  formatRouteReliabilityReport,
  formatUiReliabilityScoreSummary,
  routeAuditStabilityFingerprint,
} from "@/lib/ui/ui-route-reliability-audit";
import { FLEX_SYSTEM_ABSOLUTE_FINAL_STATE } from "@/lib/ui/flex-system-freeze";

assert.equal(FLEX_SYSTEM_ABSOLUTE_FINAL_STATE, true);

assert.equal(UI_ROUTE_AUDIT_KEYS.length, 6, "expected 6 audit route keys");

const reports = auditAllTargetRoutes();
assert.equal(reports.length, 6);

for (const route of UI_ROUTE_AUDIT_KEYS) {
  const report = auditRouteReliability(route);
  assert.equal(report.route, route);
  assert.ok(["LOW", "MEDIUM", "HIGH"].includes(report.overflowRisk));
  assert.ok(["OK", "WARNING", "BLOCKED"].includes(report.status));
  assert.ok(["OK", "DEGRADED"].includes(report.uiOsCompatibility));
  assert.ok(report.fixRecommendations.length > 0);
  assert.equal(typeof report.flex1Risk, "number");
  assert.ok(report.flex1Risk >= 0);
}

assert.equal(countGlobalNewFlexViolations(), 0, "no new flex violations globally");
assert.equal(
  reports.reduce((sum, r) => sum + r.flexViolations.new, 0),
  0,
  "no new flex violations on target routes",
);

const lavorazioni = reports.find((r) => r.route === "/lavorazioni");
const dipendenti = reports.find((r) => r.route === "/dipendenti");
const kanban = reports.find((r) => r.route === "/kanban");
assert.ok(lavorazioni);
assert.ok(dipendenti);
assert.ok(kanban);

assert.equal(lavorazioni!.uiOsCompatibility, "OK");
assert.equal(dipendenti!.uiOsCompatibility, "DEGRADED");
assert.equal(kanban!.uiOsCompatibility, "OK");

const scores = computeUiReliabilityScores(reports);
assert.equal(computeFlexStabilityScore(reports), 100);
assert.ok(scores.flexStability >= 100, "flex stability must be 100 with 0 new violations");
assert.ok(scores.mobileOverflowSafety >= 0 && scores.mobileOverflowSafety <= 100);
assert.ok(scores.uiOsCompatibility >= 70, "UI OS score must reflect OK + DEGRADED routes");
assert.ok(scores.overall >= 70);

const sample = formatRouteReliabilityReport(reports[0]!);
assert.match(sample, /\[flex-system-audit\]/);
assert.match(sample, /route:/);
assert.match(sample, /overflow-risk:/);
assert.match(sample, /flex-violations:/);
assert.match(sample, /table-risk:/);
assert.match(sample, /modal-risk:/);
assert.match(sample, /toolbar-risk:/);
assert.match(sample, /ui-os-compatibility:/);
assert.match(sample, /status:/);
assert.match(sample, /fix-recommendation:/);

const summary = formatUiReliabilityScoreSummary(scores);
assert.match(summary, /UI Flex Stability Score:/);
assert.match(summary, /Mobile Overflow Safety Score:/);
assert.match(summary, /UI OS Compatibility Score:/);
assert.match(summary, /Overall UI Reliability Score:/);

const fingerprints = new Set(reports.map(routeAuditStabilityFingerprint));
assert.equal(fingerprints.size, reports.length, "route fingerprints must be distinct");

console.log("ui-route-reliability-audit.test.ts OK");
