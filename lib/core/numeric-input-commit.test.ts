import assert from "node:assert/strict";
import {
  commitNumericDraft,
  parseNumericDraft,
  resolveCommittedNumber,
} from "@/lib/core/numeric-input-commit";
import { NUMERIC_PRESETS, resolveQuantityPreset } from "@/lib/core/numeric-input-policy";

const ore = NUMERIC_PRESETS.oreLavorazione;
const scorta = NUMERIC_PRESETS.scorta;
const prezzo = NUMERIC_PRESETS.prezzo;

assert.equal(parseNumericDraft("0."), 0);
assert.equal(parseNumericDraft("12,"), 12);

assert.deepEqual(commitNumericDraft("", ore, 1.5), { kind: "number", value: 0 });
assert.deepEqual(commitNumericDraft("0.", ore, 1.5), { kind: "number", value: 0 });
assert.deepEqual(commitNumericDraft("abc", ore, 1.5), { kind: "number", value: 1.5 });
assert.deepEqual(commitNumericDraft("12,5", prezzo, 0), { kind: "number", value: 12.5 });

const qtyPz = resolveQuantityPreset("pz");
assert.deepEqual(commitNumericDraft("2.555", qtyPz, 1), { kind: "number", value: 3 });

const qtyLt = resolveQuantityPreset("lt");
assert.deepEqual(commitNumericDraft("0.5", qtyLt, 1), { kind: "number", value: 0.5 });

assert.deepEqual(commitNumericDraft("", scorta, 5), { kind: "revert" });
assert.equal(resolveCommittedNumber(commitNumericDraft("", scorta, 5), 5), 5);

assert.deepEqual(commitNumericDraft("3", resolveQuantityPreset("pz"), 1), { kind: "number", value: 3 });
assert.deepEqual(commitNumericDraft("", resolveQuantityPreset("pz"), 1), {
  kind: "number",
  value: 1,
});

console.log("numeric-input-commit.test.ts OK");
