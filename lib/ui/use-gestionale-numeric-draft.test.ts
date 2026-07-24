import assert from "node:assert/strict";
import { simulateNumericDraftCommit } from "@/lib/ui/use-gestionale-numeric-draft";
import { NUMERIC_PRESETS } from "@/lib/core/numeric-input-policy";

const ore = NUMERIC_PRESETS.oreLavorazione;
const prezzo = NUMERIC_PRESETS.prezzo;

assert.equal(simulateNumericDraftCommit(["0.5", "__blur__"], ore, 0), 0.5);
assert.equal(simulateNumericDraftCommit(["abc", "__blur__"], ore, 1.5), 1.5);
assert.equal(simulateNumericDraftCommit(["150", "__blur__"], prezzo, 120), 150);
assert.equal(
  simulateNumericDraftCommit(["1", "__blur__"], prezzo, 120),
  1,
  "mid-typing 1 only commits on blur, not during keystrokes",
);

console.log("use-gestionale-numeric-draft.test.ts OK");
