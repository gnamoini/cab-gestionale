/**
 * Wave 1 impact report — coverage delta math.
 */
import assert from "node:assert/strict";
import { buildWaveImpactReport } from "@/lib/form-ux-migration/map-wave-1-impact-report";
import type { WaveManifest } from "@/lib/form-ux-migration/form-ux-wave-executor";

const emptyManifest: WaveManifest = {
  wave: 1,
  generatedAt: new Date().toISOString(),
  totalFields: 0,
  estimatedRisk: "low",
  excludedCount: 0,
  candidates: [],
};

const emptyImpact = buildWaveImpactReport(emptyManifest);
assert.equal(emptyImpact.candidateCount, 0);
assert.equal(emptyImpact.eligibleCandidateCount, 0);
assert.equal(emptyImpact.deltaPct, 0);
assert.ok(emptyImpact.currentCoveragePct >= 0);

const manifestWithCandidate: WaveManifest = {
  ...emptyManifest,
  totalFields: 1,
  candidates: [
    {
      fieldKey: "ricambio.label",
      formId: "ricambio",
      fieldId: "label",
      file: "components/test.tsx",
      line: 1,
      kind: "text",
      tier: 0,
      tierBand: "0",
      tier0ConfidenceScore: 1,
      recalibrationReasons: [],
      finalDecision: "INCLUDE",
      reasonTrace: ["decision:INCLUDE"],
      codemodDisposition: "SAFE_AUTO",
      regressionRisk: "LOW",
      regressionReason: "test",
      eligible: true,
      eligibilityBlockers: [],
      readiness: { checks: [], allPassed: true },
      promotionSimulation: [],
    },
  ],
};

const impact = buildWaveImpactReport(manifestWithCandidate);
assert.ok(impact.projectedCoveragePct >= impact.currentCoveragePct);
assert.equal(impact.deltaPct, impact.projectedCoveragePct - impact.currentCoveragePct);
assert.equal(impact.eligibleCandidateCount, 1);

console.log("map-wave-1-impact-report.test.ts OK");
