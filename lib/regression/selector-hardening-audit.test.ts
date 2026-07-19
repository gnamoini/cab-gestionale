/**
 * Selector System Final Hardening — CI gate on generated audit reports.
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const GENERATED = path.join(ROOT, "lib/selector-core/generated");

function readJson<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(GENERATED, name), "utf8")) as T;
}

const SUMMARY_PATH = path.join(GENERATED, "selector-hardening-audit-summary.md");
const refresh =
  process.argv.includes("--refresh") || process.env.SELECTOR_HARDENING_AUDIT_REFRESH === "1";

if (refresh || !fs.existsSync(SUMMARY_PATH)) {
  execSync("npx tsx scripts/selector-hardening-audit.ts", {
    cwd: ROOT,
    stdio: "pipe",
    timeout: 600_000,
  });
}

type ImportGraphReport = {
  brokenImportCount: number;
  hotPathCycleCount: number;
  unknownCycles: string[][];
  deadCode: { confidence: number; onHotPath: boolean }[];
};

type RuntimeReport = {
  allStable: boolean;
  surfaces: Record<string, { stable: boolean; duplicateFallbackPaths: string[] }>;
};

type BarrelReport = {
  unusedPercent: number;
  unusedPercentPass: boolean;
  indexConsumerCount: number;
};

const importGraph = readJson<ImportGraphReport>("selector-import-graph-report.json");
const runtime = readJson<RuntimeReport>("selector-runtime-surface-audit.json");
const barrel = readJson<BarrelReport>("selector-barrel-drift-report.json");
const summary = fs.readFileSync(
  path.join(GENERATED, "selector-hardening-audit-summary.md"),
  "utf8",
);

assert.equal(importGraph.brokenImportCount, 0, "broken imports must be zero");
assert.equal(importGraph.hotPathCycleCount, 0, "hot-path cycles must be zero");
assert.equal(importGraph.unknownCycles.length, 0, "unknown advisory cycles must be zero");

assert.equal(runtime.allStable, true, "runtime surface must be stable");
for (const [symbol, surface] of Object.entries(runtime.surfaces)) {
  assert.equal(surface.stable, true, `${symbol} must be stable`);
  assert.equal(
    surface.duplicateFallbackPaths.length,
    0,
    `${symbol} must have no duplicate fallback paths`,
  );
}

assert.equal(barrel.indexConsumerCount, 0, "barrel index must have zero direct consumers");
assert.ok(barrel.unusedPercentPass, `barrel UNUSED ${barrel.unusedPercent}% must be < 5%`);

const hotPathDead = importGraph.deadCode.filter((d) => d.onHotPath && d.confidence >= 90);
assert.equal(hotPathDead.length, 0, "no high-confidence dead exports on hot path");

assert.match(summary, /Import graph \(zero broken\) \| PASS/);
assert.match(summary, /Runtime surface stable \| PASS/);
assert.match(summary, /Barrel drift < 5% UNUSED \| PASS/);
assert.match(summary, /\*\*Overall:\*\* PASS/);

const indexSource = fs.readFileSync(path.join(ROOT, "lib/selector-core/index.ts"), "utf8");
assert.equal(
  (indexSource.match(/assertSingleActiveSnapshot/g) ?? []).length,
  1,
  "index.ts must not duplicate assertSingleActiveSnapshot",
);
assert.equal(
  (indexSource.match(/assertSnapshotImmutability/g) ?? []).length,
  1,
  "index.ts must not duplicate assertSnapshotImmutability",
);

console.log("selector-hardening-audit.test.ts OK");
