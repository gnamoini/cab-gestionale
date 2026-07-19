/**
 * UX regression gate — confronta skeleton benchmark candidate vs dev-baseline.
 *
 * Usage:
 *   npx tsx scripts/bench/ux-regression-gate.ts \
 *     --baseline=test-results/skeleton-benchmark-dev-baseline.json \
 *     --candidate=test-results/skeleton-benchmark-post-v3-prod.json
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { readCliArgValue } from "./benchmark-environment";

const MAX_CLS = 0.1;
const SKELETON_REGRESSION_PCT = 20;

type BenchRow = {
  route: string;
  navMode: string;
  blankAfterLoadingMs?: number;
  skeletonToInteractiveMs?: number | null;
  cls?: number | null;
};

type Snapshot = {
  hard: BenchRow[];
  soft: BenchRow[];
  uxFailures?: string[];
};

function load(path: string): Snapshot {
  assert.ok(existsSync(path), `missing ${path}`);
  return JSON.parse(readFileSync(path, "utf8")) as Snapshot;
}

function key(r: BenchRow): string {
  return `${r.route}|${r.navMode}`;
}

function index(rows: BenchRow[]): Map<string, BenchRow> {
  return new Map(rows.map((r) => [key(r), r]));
}

function main(): void {
  const baselinePath =
    readCliArgValue(process.argv, "--baseline=") ??
    join(process.cwd(), "test-results", "skeleton-benchmark-dev-baseline.json");
  const candidatePath =
    readCliArgValue(process.argv, "--candidate=") ??
    join(process.cwd(), "test-results", "skeleton-benchmark-post-v3-prod.json");
  const reportPath = readCliArgValue(process.argv, "--report=");

  const baseline = load(baselinePath);
  const candidate = load(candidatePath);
  const baseIdx = index([...baseline.hard, ...baseline.soft]);
  const failures: string[] = [];

  for (const row of [...candidate.hard, ...candidate.soft]) {
    if (row.cls != null && row.cls > MAX_CLS) {
      failures.push(`${key(row)}: CLS ${row.cls} > ${MAX_CLS}`);
    }
    const base = baseIdx.get(key(row));
    if (!base) continue;
    if (
      base.blankAfterLoadingMs != null &&
      row.blankAfterLoadingMs != null &&
      row.blankAfterLoadingMs > base.blankAfterLoadingMs
    ) {
      failures.push(
        `${key(row)}: blankAfterLoadingMs ${row.blankAfterLoadingMs} > baseline ${base.blankAfterLoadingMs}`,
      );
    }
    if (
      base.skeletonToInteractiveMs != null &&
      row.skeletonToInteractiveMs != null &&
      base.skeletonToInteractiveMs > 0
    ) {
      const maxAllowed = base.skeletonToInteractiveMs * (1 + SKELETON_REGRESSION_PCT / 100);
      if (row.skeletonToInteractiveMs > maxAllowed) {
        failures.push(
          `${key(row)}: skeletonToInteractiveMs ${row.skeletonToInteractiveMs} > +${SKELETON_REGRESSION_PCT}% baseline (${Math.round(maxAllowed)})`,
        );
      }
    }
  }

  if (reportPath) {
    const lines = ["# UX regression gate report", "", `Baseline: ${baselinePath}`, `Candidate: ${candidatePath}`, ""];
    for (const row of [...candidate.hard, ...candidate.soft]) {
      const base = baseIdx.get(key(row));
      lines.push(`## ${key(row)}`);
      lines.push(`- skeletonToInteractiveMs: ${row.skeletonToInteractiveMs ?? "n/a"} (baseline ${base?.skeletonToInteractiveMs ?? "n/a"})`);
      lines.push(`- blankAfterLoadingMs: ${row.blankAfterLoadingMs ?? "n/a"} (baseline ${base?.blankAfterLoadingMs ?? "n/a"})`);
      lines.push(`- cls: ${row.cls ?? "n/a"}`);
      lines.push("");
    }
    mkdirSync(join(process.cwd(), "test-results"), { recursive: true });
    writeFileSync(reportPath, lines.join("\n"));
  }

  if (failures.length > 0) {
    console.error("ux-regression-gate: FAIL");
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("ux-regression-gate: OK");
}

main();
