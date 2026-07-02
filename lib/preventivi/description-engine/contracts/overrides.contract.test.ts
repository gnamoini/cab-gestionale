import assert from "node:assert/strict";
import { test } from "node:test";
import {
  descriptionActivityOverrideSchema,
  isValidOverrideStatusTransition,
} from "@/lib/preventivi/description-engine/contracts/overrides.contract";

test("override schema accepts valid rephrased override", () => {
  const row = descriptionActivityOverrideSchema.parse({
    id: "550e8400-e29b-41d4-a716-446655440001",
    generationId: "550e8400-e29b-41d4-a716-446655440002",
    activityId: "freni_sostituzione_pinza",
    sourceType: "tkb_intervento",
    sourceId: "sostituzione_pinza_freno",
    action: "rephrased",
    overrideStatus: "active",
    originalText: "Sostituzione pinza freno",
    newText: "Sostituzione pinza freno anteriore",
    at: new Date().toISOString(),
    by: "admin@test",
    kbVersionAtOverride: 1,
  });
  assert.equal(row.action, "rephrased");
});

test("override status transitions: active → obsolete", () => {
  assert.equal(isValidOverrideStatusTransition("active", "obsolete"), true);
  assert.equal(isValidOverrideStatusTransition("obsolete", "active"), false);
});

test("override status transitions: active → reapplied → obsolete", () => {
  assert.equal(isValidOverrideStatusTransition("active", "reapplied"), true);
  assert.equal(isValidOverrideStatusTransition("reapplied", "obsolete"), true);
});

console.log("overrides.contract.test.ts OK");
