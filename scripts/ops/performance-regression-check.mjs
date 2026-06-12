/**
 * Performance regression diff vs baseline.
 * Usage: node scripts/ops/performance-regression-check.mjs
 * Exit 1 on FAIL (>20% regression or budget ceiling breach).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateRegressionReportMarkdown } from "./lib/generate-regression-report.mjs";
import { loadPerformanceBudgets } from "./lib/load-performance-budgets.mjs";

const ROOT = process.cwd();
const RESULTS_DIR = join(ROOT, "test-results");
const CURRENT_PATH = join(RESULTS_DIR, "performance-snapshot.json");
const BASELINE_PATH = join(RESULTS_DIR, "performance-snapshot-baseline.json");
const DIFF_PATH = join(RESULTS_DIR, "performance-regression-diff.json");
const REPORT_PATH = join(ROOT, "docs", "performance-regression-report.md");

const WARN_PCT = 10;
const FAIL_PCT = 20;

function loadJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

function pctDelta(before, after) {
  if (before == null || after == null || before === 0) return null;
  return Math.round(((after - before) / before) * 1000) / 10;
}

function severityFromDelta(deltaPct) {
  if (deltaPct == null) return "info";
  if (deltaPct > FAIL_PCT) return "fail";
  if (deltaPct > WARN_PCT) return "warn";
  return "ok";
}

function compareMetric(route, metric, before, after, failures, warnings, deltas) {
  const deltaPct = pctDelta(before, after);
  const severity = severityFromDelta(deltaPct);
  deltas.push({ route, metric, before, after, deltaPct, severity });
  if (severity === "fail") {
    failures.push({
      route,
      metric,
      message: `${metric} +${deltaPct}% vs baseline (${before} → ${after})`,
      evidence: `delta ${deltaPct}%`,
      fix: "Ripristinare query/payload precedente o aggiornare baseline dopo ottimizzazione intenzionale",
    });
  } else if (severity === "warn") {
    warnings.push({
      route,
      metric,
      message: `${metric} +${deltaPct}% vs baseline (${before} → ${after})`,
      evidence: `delta ${deltaPct}%`,
    });
  }
}

function checkBudgetCeiling(route, metric, value, max, failures) {
  if (value == null || max == null) return;
  if (value > max) {
    failures.push({
      route,
      metric,
      message: `${metric} ${value} exceeds budget ceiling ${max}`,
      evidence: `hard budget max ${max}`,
      fix: "Ridurre payload/query count o rivedere budget SSOT con evidenza snapshot",
    });
  }
}

async function main() {
  if (!existsSync(CURRENT_PATH)) {
    execFileSync("node", ["scripts/ops/performance-snapshot.mjs"], { cwd: ROOT, stdio: "inherit", shell: true });
  }

  const current = loadJson(CURRENT_PATH);
  const baseline = loadJson(BASELINE_PATH);
  const budgets = loadPerformanceBudgets();
  const budgetByRoute = Object.fromEntries(budgets.map((b) => [b.route, b]));

  const failures = [];
  const warnings = [];
  const deltas = [];
  const advisory = [];

  if (!baseline) {
    warnings.push({ message: "No baseline — run performance-snapshot first" });
  } else {
    const baseRoutes = Object.fromEntries((baseline.routes ?? []).map((r) => [r.route, r]));
    for (const routeSnap of current?.routes ?? []) {
      const base = baseRoutes[routeSnap.route];
      if (!base) continue;
      compareMetric(routeSnap.route, "payloadKb", base.payloadKb, routeSnap.payloadKb, failures, warnings, deltas);
      compareMetric(routeSnap.route, "queryCount", base.queryCount, routeSnap.queryCount, failures, warnings, deltas);
      compareMetric(
        routeSnap.route,
        "serverExecutionMs",
        base.serverExecutionMs,
        routeSnap.serverExecutionMs,
        failures,
        warnings,
        deltas,
      );
      if (base.hydrationMs != null && routeSnap.hydrationMs != null) {
        compareMetric(
          routeSnap.route,
          "hydrationMs",
          base.hydrationMs,
          routeSnap.hydrationMs,
          failures,
          warnings,
          deltas,
        );
      }
    }
    if (baseline.bundle?.firstLoadJsKb != null && current?.bundle?.firstLoadJsKb != null) {
      compareMetric(
        "global",
        "bundleKb",
        baseline.bundle.firstLoadJsKb,
        current.bundle.firstLoadJsKb,
        failures,
        warnings,
        deltas,
      );
    }
  }

  for (const routeSnap of current?.routes ?? []) {
    const b = budgetByRoute[routeSnap.route] ?? routeSnap.budget;
    if (!b) continue;
    checkBudgetCeiling(routeSnap.route, "payloadKb", routeSnap.payloadKb, b.maxPayloadKb, failures);
    checkBudgetCeiling(routeSnap.route, "queryCount", routeSnap.queryCount, b.maxQueries, failures);
    checkBudgetCeiling(routeSnap.route, "serverExecutionMs", routeSnap.serverExecutionMs, b.maxServerMs, failures);
    if (routeSnap.hydrationMs != null) {
      checkBudgetCeiling(routeSnap.route, "hydrationMs", routeSnap.hydrationMs, b.maxHydrationMs, warnings);
    }
  }

  const renderAudit = loadJson(join(RESULTS_DIR, "react-render-audit.json"));
  if (renderAudit?.excessiveRenders?.length) {
    for (const r of renderAudit.excessiveRenders) {
      advisory.push(`Render: ${r.componentName} — ${r.renderCount} renders (>${r.threshold})`);
    }
  }

  const freqAudit = loadJson(join(RESULTS_DIR, "query-frequency-audit.json"));
  if (freqAudit?.duplicate?.length) {
    for (const d of freqAudit.duplicate.slice(0, 5)) {
      advisory.push(`Query duplicate: ${d.queryKey ?? d.label} — ${d.fetches} fetches`);
    }
  }

  const diffResult = {
    generatedAt: new Date().toISOString(),
    baselineAt: baseline?.generatedAt ?? null,
    currentAt: current?.generatedAt ?? null,
    failures,
    warnings,
    deltas,
    advisory,
    thresholds: { warnPct: WARN_PCT, failPct: FAIL_PCT },
  };

  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(DIFF_PATH, JSON.stringify(diffResult, null, 2));
  writeFileSync(REPORT_PATH, generateRegressionReportMarkdown(diffResult));

  console.log(`performance-regression-check: wrote ${DIFF_PATH}`);
  console.log(`performance-regression-check: wrote ${REPORT_PATH}`);
  console.log(`failures=${failures.length} warnings=${warnings.length}`);

  if (failures.length > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
