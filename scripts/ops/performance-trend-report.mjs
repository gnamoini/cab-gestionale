/**
 * Aggregate performance artifacts into trend report + score.
 * Usage: node scripts/ops/performance-trend-report.mjs
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const RESULTS = join(ROOT, "test-results");
const TRENDS = join(RESULTS, "performance-trends");
const REPORT = join(ROOT, "docs", "performance-governance-report.md");

function loadJson(rel) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

function main() {
  mkdirSync(TRENDS, { recursive: true });
  const build = loadJson("test-results/build-budget-snapshot.json");
  const diff = loadJson("test-results/performance-regression-diff.json");
  const lighthouse = loadJson("test-results/lighthouse-snapshot.json");

  const scoreRaw = execFileSync("npx", ["tsx", "scripts/ops/run-performance-score.ts"], {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
  });

  const score = JSON.parse(scoreRaw.trim());
  const latest = {
    generatedAt: new Date().toISOString(),
    score,
    build: build ? { firstLoadJsKb: build.firstLoadJsKb, vendorChunkKb: build.vendorChunkKb } : null,
    regressionFailures: diff?.failures?.length ?? 0,
    lighthouse: lighthouse?.vitals ?? null,
  };

  writeFileSync(join(TRENDS, "latest.json"), JSON.stringify(latest, null, 2));
  appendFileSync(join(TRENDS, "history.jsonl"), `${JSON.stringify(latest)}\n`);

  const regressionLines = diff?.failures?.length
    ? diff.failures.map((f) => `- FAIL: ${f.message ?? f.metric}`).join("\n")
    : "- No regression failures";
  const warningLines =
    diff?.warnings?.length > 0
      ? `\n\n### Warnings\n\n${diff.warnings.map((w) => `- WARN: ${w.message ?? w.metric}`).join("\n")}`
      : "";

  const lines = [
    "# Performance Governance Report",
    "",
    `**Generated:** ${latest.generatedAt}`,
    "",
    "## Score",
    "",
    `| Category | Score |`,
    `|----------|-------|`,
    ...Object.entries(score)
      .filter(([k]) => k !== "total")
      .map(([k, v]) => `| ${k} | ${v} |`),
    `| **total** | **${score.total}** |`,
    "",
    "## Bundle",
    "",
    build
      ? `- First load JS: ${build.firstLoadJsKb} KB\n- Vendor chunk: ${build.vendorChunkKb} KB`
      : "- No build snapshot (run `npm run build` + `ops:build-budget-gate`)",
    "",
    "## Regression",
    "",
    regressionLines + warningLines,
    "",
    "## Web Vitals",
    "",
    lighthouse?.vitals
      ? `- Source: ${lighthouse.vitals.source}\n- LCP: ${lighthouse.vitals.lcpMs ?? "n/a"} ms\n- TTFB: ${lighthouse.vitals.ttfbMs ?? "n/a"} ms`
      : "- Run `ops:lighthouse-budget` or e2e/perf",
    "",
  ];

  writeFileSync(REPORT, lines.join("\n"));
  console.log(`performance-trend-report: wrote ${REPORT}`);
  console.log(`performance-trend-report: score=${score.total}`);
}

main();
