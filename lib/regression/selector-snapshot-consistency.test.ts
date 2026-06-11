/**
 * v5.2/v5.3 snapshot consistency — reproducibility, pointer model, immutability.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildSelectorRuntimeSnapshotDeterministic,
  mergeApprovedProposals,
  SELECTOR_BASE_SNAPSHOT_V0,
  SELECTOR_ENGINE_CONFIG_BASE,
} from "@/lib/selector-core/selector-config-snapshot";
import { computeDomainAwareConfidence } from "@/lib/selector-core/selector-confidence-model";
import { selectorEngineConfig } from "@/lib/selector-core/selector-engine-config";
import { loadLatestSelectorSnapshot } from "@/lib/selector-core/selector-config-runtime-loader";
import {
  evaluatePromotionEligibility,
  __resetPromotionEngineForTests,
} from "@/lib/selector-core/selector-insight-promotion-engine";
import {
  __resetPromotionRegistryForTests,
  createEmptyRegistryState,
} from "@/lib/selector-core/selector-config-promotion-registry";
import { readPointer } from "@/lib/selector-core/selector-snapshot-atomic-switch";
import {
  activateSnapshot,
  buildAndPublishSnapshot,
  getSnapshot,
  saveSnapshot,
  stageSnapshot,
} from "@/lib/selector-core/selector-snapshot-registry";
import type { SelectorAdaptiveInsight, SelectorConfigProposal } from "@/lib/selector-core/types";

const baseProposal = (
  overrides: Partial<SelectorConfigProposal> = {},
): SelectorConfigProposal => ({
  id: "prop-addetti-1",
  targetDomain: "addetti",
  proposedChange: { surfacePreference: "sheet", rolloutAdjustment: "ENABLED" },
  evidence: {
    metricsSummary: {
      totalOpens: 15,
      surfaceCounts: { dropdown: 14, sheet: 0, searchableDropdown: 1 },
      bucketCounts: { "2-5": 0, "6-20": 1, "20-100": 14, "100+": 0 },
      searchUsageRate: 1,
      sheetUsageRate: 0,
      dropdownRate: 0.93,
      fallbackRate: 0,
      avgDecisionLatencyMs: 2,
      mobileRate: 0.9,
      dropdownAbandonRate: null,
    },
    supportingInsights: ["test"],
  },
  riskAssessment: { riskLevel: "low", reasons: ["test"] },
  status: "approved",
  confidence: 0.95,
  rawConfidence: 1,
  sampleSize: 15,
  createdAt: new Date().toISOString(),
  version: 1,
  ...overrides,
});

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "selector-v53-consistency-"));
const storeDir = path.join(tmpRoot, "snapshots");
const generatedDir = path.join(tmpRoot, "generated");
const pointerPath = path.join(generatedDir, "selector-active-pointer.json");

const registryA = {
  version: 3,
  proposals: [
    baseProposal({ id: "prop-a", status: "proposed" }),
    baseProposal({ id: "prop-b", status: "approved" }),
    baseProposal({ id: "prop-c", status: "rejected", targetDomain: "report" }),
  ],
  log: [],
  rollbackSnapshots: [],
};

const run1 = buildSelectorRuntimeSnapshotDeterministic(registryA);
const run2 = buildSelectorRuntimeSnapshotDeterministic(registryA);
assert.deepEqual(run1, run2);
assert.deepEqual(run1.provenance.appliedProposals, ["prop-b"]);

saveSnapshot({ ...SELECTOR_BASE_SNAPSHOT_V0, version: "v-test-immutable" }, storeDir);
assert.throws(
  () => saveSnapshot({ ...SELECTOR_BASE_SNAPSHOT_V0, version: "v-test-immutable" }, storeDir),
  /immutable/,
);

fs.mkdirSync(generatedDir, { recursive: true });
fs.writeFileSync(
  pointerPath,
  `${JSON.stringify({ activeVersion: "v0", previousVersion: "v0", status: "stable", updatedAt: 0 }, null, 2)}\n`,
);

buildAndPublishSnapshot(
  { ...registryA, version: 1, proposals: [] },
  { storeDir, pointerPath, version: "v1" },
);
const snap2 = buildAndPublishSnapshot(registryA, { storeDir, pointerPath, version: "snap-3" });
assert.equal(readPointer(pointerPath).activeVersion, snap2.version);

activateSnapshot("v1", storeDir, pointerPath);
assert.equal(readPointer(pointerPath).activeVersion, "v1");
assert.deepEqual(getSnapshot("v1", storeDir).version, "v1");

assert.equal(selectorEngineConfig.thresholds.sheetMinOptions, loadLatestSelectorSnapshot().config.thresholds.sheetMinOptions);
assert.equal(selectorEngineConfig.defaultBehavior.fallbackSurface, "dropdown");

const insightTemplate = (domain: string): SelectorAdaptiveInsight => ({
  domain,
  currentBehavior: {
    preferredSurface: "dropdown",
    usageStats: {
      totalOpens: 50,
      surfaceCounts: { dropdown: 12, sheet: 0, searchableDropdown: 0 },
      bucketCounts: { "2-5": 5, "6-20": 10, "20-100": 30, "100+": 5 },
      searchUsageRate: 0.9,
      sheetUsageRate: 0,
      dropdownRate: 1,
      fallbackRate: 0,
      avgDecisionLatencyMs: 2,
      mobileRate: 0.8,
      dropdownAbandonRate: null,
    },
  },
  recommendation: {
    suggestedSurface: "sheet",
    confidence: 0.8,
    reason: ["searchUsageRate high with dominant dropdown"],
  },
});

assert.ok(
  computeDomainAwareConfidence(insightTemplate("lavorazioni")) >
    computeDomainAwareConfidence(insightTemplate("report")),
);
__resetPromotionEngineForTests();
assert.equal(evaluatePromotionEligibility(insightTemplate("lavorazioni")).eligible, true);
assert.equal(evaluatePromotionEligibility(insightTemplate("report")).eligible, false);

const beforeRollback = mergeApprovedProposals(SELECTOR_ENGINE_CONFIG_BASE, [
  baseProposal({
    id: "prop-x",
    status: "approved",
    targetDomain: "report",
    proposedChange: { rolloutAdjustment: "ENABLED" },
  }),
]);
const afterRollback = mergeApprovedProposals(SELECTOR_ENGINE_CONFIG_BASE, []);
assert.notEqual(beforeRollback.slice.rolloutByDomain.report, afterRollback.slice.rolloutByDomain.report);

assert.throws(() => stageSnapshot("v-missing", storeDir), /not found/);

__resetPromotionRegistryForTests();
createEmptyRegistryState();
fs.rmSync(tmpRoot, { recursive: true, force: true });

console.log("selector-snapshot-consistency.test.ts OK");
