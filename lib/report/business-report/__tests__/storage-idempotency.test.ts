import assert from "node:assert/strict";
import {
  buildIdempotencyKey,
  buildLogicalReportKey,
} from "@/lib/report/business-report/idempotency/report-run-keys";
import { resolveGenerateAttempt } from "@/lib/report/business-report/idempotency/resolve-generate-attempt";

type Row = {
  id: string;
  logical_report_key: string;
  generation_version: number;
  idempotency_key: string;
  status: "generating" | "completed" | "failed";
  generated_at: string;
};

/** In-memory SSOT mirroring report_runs constraints for closure tests. */
class InMemoryReportRuns {
  rows: Row[] = [];
  generatingByLogical = new Map<string, string>();

  findCompleted(logical: string): Row | null {
    return (
      this.rows
        .filter((r) => r.logical_report_key === logical && r.status === "completed")
        .sort((a, b) => b.generation_version - a.generation_version)[0] ?? null
    );
  }

  findGenerating(logical: string): Row | null {
    const id = this.generatingByLogical.get(logical);
    return id ? (this.rows.find((r) => r.id === id) ?? null) : null;
  }

  findLatest(logical: string): Row | null {
    return (
      this.rows
        .filter((r) => r.logical_report_key === logical)
        .sort((a, b) => b.generation_version - a.generation_version)[0] ?? null
    );
  }

  maxVersion(logical: string): number {
    return this.findLatest(logical)?.generation_version ?? 0;
  }

  begin(input: {
    runId: string;
    logical: string;
    generationVersion: number;
    idempotencyKey: string;
  }): "ok" | "already_running" {
    if (this.generatingByLogical.has(input.logical)) return "already_running";
    if (this.rows.some((r) => r.logical_report_key === input.logical && r.generation_version === input.generationVersion)) {
      return "already_running";
    }
    this.rows.push({
      id: input.runId,
      logical_report_key: input.logical,
      generation_version: input.generationVersion,
      idempotency_key: input.idempotencyKey,
      status: "generating",
      generated_at: new Date().toISOString(),
    });
    this.generatingByLogical.set(input.logical, input.runId);
    return "ok";
  }

  reactivate(runId: string): boolean {
    const row = this.rows.find((r) => r.id === runId);
    if (!row || (row.status !== "failed" && row.status !== "generating")) return false;
    row.status = "generating";
    row.generated_at = new Date().toISOString();
    this.generatingByLogical.set(row.logical_report_key, runId);
    return true;
  }

  fail(runId: string): void {
    const row = this.rows.find((r) => r.id === runId);
    if (!row) return;
    row.status = "failed";
    if (this.generatingByLogical.get(row.logical_report_key) === runId) {
      this.generatingByLogical.delete(row.logical_report_key);
    }
  }

  complete(runId: string): void {
    const row = this.rows.find((r) => r.id === runId);
    if (!row) return;
    row.status = "completed";
    if (this.generatingByLogical.get(row.logical_report_key) === runId) {
      this.generatingByLogical.delete(row.logical_report_key);
    }
  }
}

const base = {
  reportType: "weekly" as const,
  periodStart: "2026-08-11",
  periodEnd: "2026-08-17",
  compareMode: "prev_period" as const,
};

const logical = buildLogicalReportKey(base);
const store = new InMemoryReportRuns();

// Concurrent begin — second call blocked
const r1 = store.begin({
  runId: "run-1",
  logical,
  generationVersion: 1,
  idempotencyKey: buildIdempotencyKey({ ...base, generationVersion: 1 }),
});
const r2 = store.begin({
  runId: "run-2",
  logical,
  generationVersion: 1,
  idempotencyKey: buildIdempotencyKey({ ...base, generationVersion: 1 }),
});
assert.equal(r1, "ok");
assert.equal(r2, "already_running");

// Failed retry — same generation_version
store.fail("run-1");
const latestAfterFail = store.findLatest(logical);
const generatingAfterFail = store.findGenerating(logical);
const attempt = resolveGenerateAttempt({
  regenerate: false,
  hasCompleted: false,
  generating: generatingAfterFail
    ? {
        id: generatingAfterFail.id,
        status: generatingAfterFail.status,
        generationVersion: generatingAfterFail.generation_version,
        generatedAt: generatingAfterFail.generated_at,
      }
    : null,
  latestRun: latestAfterFail
    ? {
        id: latestAfterFail.id,
        status: latestAfterFail.status,
        generationVersion: latestAfterFail.generation_version,
        generatedAt: latestAfterFail.generated_at,
      }
    : null,
  maxGenerationVersion: store.maxVersion(logical),
});
assert.equal(attempt.action, "reactivate");
if (attempt.action === "reactivate") {
  assert.equal(attempt.generationVersion, 1);
  assert.ok(store.reactivate(attempt.runId));
  store.complete(attempt.runId);
}

// Completed cache path
assert.ok(store.findCompleted(logical));
const cacheAttempt = resolveGenerateAttempt({
  regenerate: false,
  hasCompleted: Boolean(store.findCompleted(logical)),
  generating: null,
  latestRun: null,
  maxGenerationVersion: store.maxVersion(logical),
});
assert.equal(cacheAttempt.action, "cache");

// Regenerate bumps version
const regen = resolveGenerateAttempt({
  regenerate: true,
  hasCompleted: true,
  generating: null,
  latestRun: null,
  maxGenerationVersion: store.maxVersion(logical),
});
assert.equal(regen.action, "insert");
if (regen.action === "insert") {
  assert.equal(regen.generationVersion, 2);
}

// Weekly vs monthly — distinct logical keys
const monthlyLogical = buildLogicalReportKey({ ...base, reportType: "monthly", periodStart: "2026-08-01", periodEnd: "2026-08-31" });
assert.notEqual(logical, monthlyLogical);

console.log("storage-idempotency.test.ts OK");
