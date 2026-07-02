import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_AI_POLISH_CONSTRAINTS,
  polishDescriptionWithAi,
} from "@/lib/preventivi/description-engine/ai-polish";
import type { GeneratedDescriptionLine } from "@/lib/preventivi/description-engine/types";

const sampleLines: GeneratedDescriptionLine[] = [
  {
    activityId: "freni_sostituzione_pinza",
    text: "Sostituzione pinza freno",
    sourceType: "tkb_intervento",
    sourceId: "sostituzione_pinza_freno",
    confidence: 0.9,
    isVerifiedTechnical: true,
    sort: 1,
  },
];

test("AI polish: no polishFn → not applied", () => {
  const r = polishDescriptionWithAi(sampleLines);
  assert.equal(r.applied, false);
});

test("AI polish: line count change → reject", () => {
  const r = polishDescriptionWithAi(sampleLines, DEFAULT_AI_POLISH_CONSTRAINTS, () => []);
  assert.equal(r.applied, false);
  assert.equal(r.rejectReason, "line_count_changed");
});

test("AI polish: commercial tone → reject", () => {
  const r = polishDescriptionWithAi(sampleLines, DEFAULT_AI_POLISH_CONSTRAINTS, () => [
    "Offerta speciale sostituzione pinza freno",
  ]);
  assert.equal(r.applied, false);
  assert.equal(r.rejectReason, "commercial_tone_detected");
});

console.log("ai-polish.test.ts OK");
