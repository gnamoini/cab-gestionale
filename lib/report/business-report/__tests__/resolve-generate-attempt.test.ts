import assert from "node:assert/strict";
import {
  GENERATING_STALE_TTL_MS,
  isGeneratingRunStale,
  resolveGenerateAttempt,
} from "@/lib/report/business-report/idempotency/resolve-generate-attempt";

const now = Date.parse("2026-08-21T12:00:00.000Z");
const recent = new Date(now - 5 * 60 * 1000).toISOString();
const stale = new Date(now - GENERATING_STALE_TTL_MS - 1000).toISOString();

assert.equal(isGeneratingRunStale(recent, now), false);
assert.equal(isGeneratingRunStale(stale, now), true);

const cache = resolveGenerateAttempt({
  regenerate: false,
  hasCompleted: true,
  generating: null,
  latestRun: null,
  maxGenerationVersion: 1,
  nowMs: now,
});
assert.equal(cache.action, "cache");

const running = resolveGenerateAttempt({
  regenerate: false,
  hasCompleted: false,
  generating: { id: "g1", status: "generating", generationVersion: 1, generatedAt: recent },
  latestRun: null,
  maxGenerationVersion: 0,
  nowMs: now,
});
assert.equal(running.action, "already_running");

const staleGen = resolveGenerateAttempt({
  regenerate: false,
  hasCompleted: false,
  generating: { id: "g1", status: "generating", generationVersion: 1, generatedAt: stale },
  latestRun: null,
  maxGenerationVersion: 0,
  nowMs: now,
});
assert.equal(staleGen.action, "reactivate");
assert.equal(staleGen.reason, "stale_generating");

const failedRetry = resolveGenerateAttempt({
  regenerate: false,
  hasCompleted: false,
  generating: null,
  latestRun: { id: "f1", status: "failed", generationVersion: 1, generatedAt: recent },
  maxGenerationVersion: 1,
  nowMs: now,
});
assert.equal(failedRetry.action, "reactivate");
assert.equal(failedRetry.generationVersion, 1);

const regenerate = resolveGenerateAttempt({
  regenerate: true,
  hasCompleted: true,
  generating: null,
  latestRun: { id: "c1", status: "completed", generationVersion: 2, generatedAt: recent },
  maxGenerationVersion: 2,
  nowMs: now,
});
assert.equal(regenerate.action, "insert");
assert.equal(regenerate.generationVersion, 3);

console.log("resolve-generate-attempt.test.ts OK");
