import assert from "node:assert/strict";
import { test } from "node:test";
import { validateNoAnonymousLines } from "@/lib/preventivi/description-engine/provenance";
import { generatedDescriptionLineSchema } from "@/lib/preventivi/description-engine/contracts/engine-meta.contract";
import { computeAggregateConfidence, confidenceTierFromScore } from "@/lib/domain/technical-knowledge-base";

test("provenance: riga senza sourceId fallisce", () => {
  assert.throws(() =>
    validateNoAnonymousLines([
      {
        activityId: "freni_test",
        text: "Test",
        sourceType: "tkb_intervento",
        sourceId: "",
        confidence: 0.9,
        isVerifiedTechnical: true,
        sort: 1,
      },
    ]),
  );
});

test("confidence tier boundaries", () => {
  assert.equal(confidenceTierFromScore(0.75), "high");
  assert.equal(confidenceTierFromScore(0.55), "medium");
  assert.equal(confidenceTierFromScore(0.3), "low");
});

test("confidence aggregate clamp", () => {
  const score = computeAggregateConfidence({
    keywordMatch: 1,
    componentMatch: 1,
    symptomMatch: 1,
    compatibility: 1,
    legacyPenalty: 0,
  });
  assert.ok(score <= 1 && score >= 0.9);
});

test("generated line schema accepts valid line", () => {
  const line = generatedDescriptionLineSchema.parse({
    activityId: "freni_sostituzione_pinza",
    text: "Sostituzione pinza freno",
    sourceType: "tkb_intervento",
    sourceId: "sostituzione_pinza_freno",
    confidence: 0.91,
    isVerifiedTechnical: true,
    sort: 1,
  });
  assert.equal(line.sourceType, "tkb_intervento");
});

console.log("provenance.contract.test.ts OK");
