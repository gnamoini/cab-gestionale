import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeAggregateConfidence,
  confidenceTierFromScore,
} from "@/lib/domain/technical-knowledge-base";

test("confidence tier: high boundary ≥ 0.70", () => {
  assert.equal(confidenceTierFromScore(0.7), "high");
  assert.equal(confidenceTierFromScore(0.69), "medium");
});

test("confidence tier: medium boundary ≥ 0.45", () => {
  assert.equal(confidenceTierFromScore(0.45), "medium");
  assert.equal(confidenceTierFromScore(0.44), "low");
});

test("confidence aggregate penalizes legacy", () => {
  const factors = {
    keywordMatch: 0.8,
    componentMatch: 0.7,
    symptomMatch: 0.6,
    compatibility: 1,
    legacyPenalty: 0,
  };
  const base = computeAggregateConfidence(factors);
  const penalized = computeAggregateConfidence({ ...factors, legacyPenalty: 0.4 });
  assert.ok(penalized < base);
});

console.log("confidence.contract.test.ts OK");
