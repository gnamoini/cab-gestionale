import assert from "node:assert/strict";
import {
  buildIdempotencyKey,
  buildLogicalReportKey,
} from "@/lib/report/business-report/idempotency/report-run-keys";
import { resolveGenerateAttempt } from "@/lib/report/business-report/idempotency/resolve-generate-attempt";

type RunRow = {
  id: string;
  logical_report_key: string;
  generation_version: number;
  status: "generating" | "completed" | "failed";
  ai_status: "completed" | "unavailable";
  generated_at: string;
  error?: string;
};

/**
 * Simulates production path:
 * generate → AI timeout/failure → failed/unavailable → retry (generate) → completed → history.
 */
const base = {
  reportType: "weekly" as const,
  periodStart: "2026-08-11",
  periodEnd: "2026-08-17",
  compareMode: "prev_period" as const,
};
const logical = buildLogicalReportKey(base);
const history: RunRow[] = [];
let aiAttempts = 0;

function simulateAiCall(): { ok: boolean; unavailable: boolean } {
  aiAttempts += 1;
  if (aiAttempts === 1) return { ok: false, unavailable: true };
  return { ok: true, unavailable: false };
}

function snapshot() {
  const completed = history.find((r) => r.logical_report_key === logical && r.status === "completed");
  const generating = history.find((r) => r.logical_report_key === logical && r.status === "generating");
  const latest =
    [...history.filter((r) => r.logical_report_key === logical)].sort(
      (a, b) => b.generation_version - a.generation_version,
    )[0] ?? null;
  return { completed, generating, latest };
}

function runGenerate(regenerate: boolean): "cached" | "completed" | "failed" | "already_running" {
  const { completed, generating, latest } = snapshot();
  const attempt = resolveGenerateAttempt({
    regenerate,
    hasCompleted: Boolean(!regenerate && completed),
    generating: generating
      ? {
          id: generating.id,
          status: generating.status,
          generationVersion: generating.generation_version,
          generatedAt: generating.generated_at,
        }
      : null,
    latestRun: latest
      ? {
          id: latest.id,
          status: latest.status,
          generationVersion: latest.generation_version,
          generatedAt: latest.generated_at,
        }
      : null,
    maxGenerationVersion: latest?.generation_version ?? 0,
  });

  if (attempt.action === "cache") return "cached";
  if (attempt.action === "already_running") return "already_running";

  let runId: string;
  let generationVersion: number;

  if (attempt.action === "reactivate") {
    runId = attempt.runId;
    generationVersion = attempt.generationVersion;
    const row = history.find((r) => r.id === runId);
    assert.ok(row);
    row!.status = "generating";
    row!.generated_at = new Date().toISOString();
    row!.error = undefined;
  } else {
    runId = `run-v${attempt.generationVersion}`;
    generationVersion = attempt.generationVersion;
    history.push({
      id: runId,
      logical_report_key: logical,
      generation_version: generationVersion,
      status: "generating",
      ai_status: "unavailable",
      generated_at: new Date().toISOString(),
    });
  }

  const ai = simulateAiCall();
  const row = history.find((r) => r.id === runId)!;

  if (!ai.ok) {
    row.status = "failed";
    row.ai_status = "unavailable";
    row.error = "gemini_timeout";
    return "failed";
  }

  row.status = "completed";
  row.ai_status = "completed";
  return "completed";
}

// First attempt — AI timeout → failed (fallback disabled path)
const first = runGenerate(false);
assert.equal(first, "failed");
assert.equal(history.filter((r) => r.logical_report_key === logical).length, 1);
assert.equal(history[0]!.generation_version, 1);
assert.equal(history[0]!.status, "failed");

// Technical retry — same generation_version, AI succeeds
const second = runGenerate(false);
assert.equal(second, "completed");
assert.equal(history.filter((r) => r.logical_report_key === logical).length, 1);
assert.equal(history[0]!.generation_version, 1);
assert.equal(history[0]!.status, "completed");
assert.equal(history[0]!.ai_status, "completed");

// Idempotent generate — cache
const third = runGenerate(false);
assert.equal(third, "cached");

// Regenerate — new version in history
const fourth = runGenerate(true);
assert.equal(fourth, "completed");
const generations = history
  .filter((r) => r.logical_report_key === logical)
  .map((r) => r.generation_version)
  .sort();
assert.deepEqual(generations, [1, 2]);
assert.equal(
  history.filter((r) => r.logical_report_key === logical && r.status === "completed").length,
  2,
);

// Idempotency keys remain unique per generation
const keys = [1, 2].map((v) => buildIdempotencyKey({ ...base, generationVersion: v }));
assert.equal(new Set(keys).size, 2);

console.log("failure-retry-lifecycle.test.ts OK");
