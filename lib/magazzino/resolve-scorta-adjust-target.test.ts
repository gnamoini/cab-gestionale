import assert from "node:assert/strict";
import { resolveScortaAdjustTarget } from "@/lib/magazzino/resolve-scorta-adjust-target";

assert.deepEqual(resolveScortaAdjustTarget(0, 1), { prima: 0, dopo: 1, appliedDelta: 1 });
assert.deepEqual(resolveScortaAdjustTarget(1, -1), { prima: 1, dopo: 0, appliedDelta: -1 });
assert.equal(resolveScortaAdjustTarget(0, -1), null);
assert.equal(resolveScortaAdjustTarget(2, 0), null);

console.log("resolve-scorta-adjust-target.test.ts OK");
