#!/usr/bin/env npx tsx
/**
 * Technical Debt Score for dead-code audit governance.
 * score = files*1 + deprecatedExports*2 + legacyFlags*5 + fallbackPaths*3 + orphanNodes*1
 *
 * Usage: npx tsx scripts/audit-technical-debt-score.ts [--out artifacts/...]
 */
import fs from "node:fs";
import path from "node:path";
import { DEPRECATED_FALLBACK_REGISTRY } from "@/lib/observability/deprecated-fallback-registry";

const ROOT = process.cwd();
const DEFAULT_OUT = path.join(ROOT, "artifacts", "audit", "dead-code-baseline", "debt-score.json");

function countTsTsxFiles(): number {
  let count = 0;
  function walk(dir: string): void {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (/\.(tsx?)$/.test(ent.name)) count++;
    }
  }
  for (const d of ["app", "components", "lib", "src", "hooks", "context", "types", "scripts"]) {
    walk(path.join(ROOT, d));
  }
  return count;
}

function countDeprecatedExports(): number {
  let count = 0;
  const re = /@deprecated/gi;
  function walk(dir: string): void {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (/\.(tsx?)$/.test(ent.name)) {
        const content = fs.readFileSync(full, "utf8");
        const matches = content.match(re);
        if (matches) count += matches.length;
      }
    }
  }
  for (const d of ["app", "components", "lib", "src"]) walk(path.join(ROOT, d));
  return count;
}

function countLegacyFlags(): number {
  const flagDir = path.join(ROOT, "lib", "feature-flags");
  let count = 0;
  if (fs.existsSync(flagDir)) {
    count += fs.readdirSync(flagDir).filter((f) => f.endsWith("-flag.ts")).length;
  }
  const extra = [
    "lib/notifications/notifications-v2-flag.ts",
    "lib/notifications/notifications-ssot-v2-flag.ts",
    "lib/form-ux-migration/config.ts",
    "lib/officina/mezzo-attrezzature-v2-flag.ts",
    "lib/officina/maintenance-plans-v1-flag.ts",
    "lib/officina/asset-lifecycle-v1-flag.ts",
  ];
  for (const f of extra) {
    if (fs.existsSync(path.join(ROOT, f))) count++;
  }
  return count;
}

function readOrphanNodes(): number {
  const graphArg = process.argv.indexOf("--graph");
  const label = graphArg >= 0 ? process.argv[graphArg + 1] ?? "before" : "before";
  const summaryPath = path.join(ROOT, "artifacts", "audit", "dependency-graph", `${label}.summary.json`);
  if (!fs.existsSync(summaryPath)) return 0;
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8")) as { orphanNodes?: number };
  return summary.orphanNodes ?? 0;
}

export type DebtScore = {
  generatedAt: string;
  files: number;
  deprecatedExports: number;
  legacyFlags: number;
  fallbackPaths: number;
  orphanNodes: number;
  score: number;
};

export function computeDebtScore(): DebtScore {
  const files = countTsTsxFiles();
  const deprecatedExports = countDeprecatedExports();
  const legacyFlags = countLegacyFlags();
  const fallbackPaths = DEPRECATED_FALLBACK_REGISTRY.length;
  const orphanNodes = readOrphanNodes();
  const score =
    files * 1 + deprecatedExports * 2 + legacyFlags * 5 + fallbackPaths * 3 + orphanNodes * 1;

  return {
    generatedAt: new Date().toISOString(),
    files,
    deprecatedExports,
    legacyFlags,
    fallbackPaths,
    orphanNodes,
    score,
  };
}

function main(): void {
  const outArg = process.argv.indexOf("--out");
  const outPath = outArg >= 0 ? process.argv[outArg + 1]! : DEFAULT_OUT;
  const result = computeDebtScore();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`Technical Debt Score: ${result.score}`);
  console.log(JSON.stringify(result, null, 2));

  const trendPath = path.join(ROOT, "artifacts", "audit", "dead-code-baseline", "debt-score-trend.json");
  const baselineScore = 6003;
  const phase5Score = 5926;
  let trend: {
    history: { phase: string; score: number | null; date: string | null }[];
    deltas: Record<string, number | null>;
  } = {
    history: [
      { phase: "baseline", score: baselineScore, date: "2026-07-01" },
      { phase: "phase5", score: phase5Score, date: "2026-07-15" },
      { phase: "phase9", score: null, date: null },
    ],
    deltas: { phase5: -1.3, phase9: null },
  };
  if (fs.existsSync(trendPath)) {
    trend = JSON.parse(fs.readFileSync(trendPath, "utf8")) as typeof trend;
  }
  const phase9Idx = trend.history.findIndex((h) => h.phase === "phase9");
  if (phase9Idx >= 0) {
    trend.history[phase9Idx] = {
      phase: "phase9",
      score: result.score,
      date: new Date().toISOString().slice(0, 10),
    };
    trend.deltas.phase9 = Number(
      (((result.score - baselineScore) / baselineScore) * 100).toFixed(1),
    );
  }
  fs.writeFileSync(trendPath, JSON.stringify(trend, null, 2));
}

main();
