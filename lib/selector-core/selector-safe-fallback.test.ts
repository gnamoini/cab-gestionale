import assert from "node:assert/strict";
import {
  createFallbackDecision,
  normalizeSelectorContext,
} from "@/lib/selector-core/selector-safe-fallback";

const fallback = createFallbackDecision(["test_reason"]);
assert.equal(fallback.surface, "dropdown");
assert.equal(fallback.fallbackUsed, true);
assert.deepEqual(fallback.matchedRules, ["fallback.safe"]);
assert.equal(fallback.flags.usesSearch, false);

const invalid = normalizeSelectorContext({ optionCount: Number.NaN, mode: "selectOnly", isMobile: true });
assert.equal(invalid.kind, "fallback");

const negative = normalizeSelectorContext({
  optionCount: -5,
  mode: "selectOnly",
  isMobile: true,
  domain: "addetti",
});
assert.equal(negative.kind, "ok");
if (negative.kind === "ok") {
  assert.equal(negative.ctx.optionCount, 0);
  assert.ok(negative.warnings.some((w) => w.includes("clamped")));
}

console.log("selector-safe-fallback.test.ts OK");
