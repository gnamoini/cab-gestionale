/**
 * Performance snapshot — baseline for regression guard.
 * Usage: node scripts/ops/performance-snapshot.mjs [--refresh-baseline]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildExplainQueries } from "./lib/explain-queries.mjs";
import { loadPerformanceBudgets } from "./lib/load-performance-budgets.mjs";
import { runExplainQuery } from "./lib/parseExplain.mjs";
import { runRestBenchmarkSubset } from "./lib/rest-benchmark-subset.mjs";
import { canRunLinkedDb, runSql } from "./lib/runSql.mjs";

const ROOT = process.cwd();
const RESULTS_DIR = join(ROOT, "test-results");
const OUTPUT = join(RESULTS_DIR, "performance-snapshot.json");
const BASELINE = join(RESULTS_DIR, "performance-snapshot-baseline.json");
const REFRESH_BASELINE = process.argv.includes("--refresh-baseline");

function loadJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

function loadPlaywrightHydration() {
  const perfDir = join(ROOT, "e2e", "test-results", "perf-playwright");
  if (!existsSync(perfDir)) return {};
  const out = {};
  for (const file of ["perf-snapshot-admin.json", "perf-snapshot.json"]) {
    const p = join(perfDir, file);
    const data = loadJson(p);
    if (!data?.snapshots) continue;
    for (const s of data.snapshots) {
      if (s.mode !== "cold") continue;
      const route = s.route?.startsWith("/") ? s.route : `/${s.route ?? ""}`;
      out[route] = s.interactiveMs ?? s.domContentLoadedMs ?? s.navigationMs ?? null;
    }
  }
  return out;
}

function loadBundleMetrics() {
  const buildBudget = loadJson(join(RESULTS_DIR, "build-budget-snapshot.json"));
  if (buildBudget?.firstLoadJsKb) {
    return {
      firstLoadJsKb: buildBudget.firstLoadJsKb,
      routeChunks: buildBudget.routeChunks ?? {},
      vendorChunkKb: buildBudget.vendorChunkKb ?? null,
    };
  }
  const synthetic = loadJson(join(RESULTS_DIR, "perf-audit-synthetic.json"));
  if (synthetic?.bundleKb) return { firstLoadJsKb: synthetic.bundleKb, routeChunks: synthetic.routeChunks ?? {} };
  return { firstLoadJsKb: null, routeChunks: {}, vendorChunkKb: null };
}

function loadDuplicateQueries() {
  const audit = loadJson(join(RESULTS_DIR, "query-frequency-audit.json"));
  if (!audit?.duplicate) return null;
  return audit.duplicate.length;
}

function loadWebsocketChannels() {
  const globalRaw = readFileSync(join(ROOT, "lib/performance/performance-global-budgets.ts"), "utf8");
  const match = globalRaw.match(/MAX_REALTIME_CHANNELS\s*=\s*(\d+)/);
  return match ? Number(match[1]) : null;
}

function loadMemoryMb() {
  const soak = loadJson(join(RESULTS_DIR, "long-session-soak-snapshot.json"));
  if (soak?.heapUsedMb != null) return soak.heapUsedMb;
  const diag = loadJson(join(RESULTS_DIR, "perf-diagnostics-snapshot.json"));
  if (diag?.memoryMb != null) return diag.memoryMb;
  return null;
}

function coldLoadQueryCount(budget) {
  if (budget.scopeKeys?.length) return budget.scopeKeys.length;
  if (budget.restProxyId) return 1;
  return 0;
}

function loadCacheHitRatio() {
  const counts = loadJson(join(RESULTS_DIR, "cache-fetch-counts.json"));
  if (!Array.isArray(counts) || counts.length === 0) return null;
  const total = counts.reduce((s, r) => s + (r.fetches ?? 0), 0);
  const ssrScopes = counts.filter((r) => {
    const k = String(r.queryKey);
    return k.includes("lavorazioni") || k.includes("mezzi") || k.includes("magazzino");
  });
  const ssrFetches = ssrScopes.reduce((s, r) => s + (r.fetches ?? 0), 0);
  if (total === 0) return 1;
  return Math.round((1 - ssrFetches / total) * 1000) / 1000;
}

async function main() {
  const warnings = [];
  const budgets = loadPerformanceBudgets();
  const hydrationByRoute = loadPlaywrightHydration();
  const bundle = loadBundleMetrics();
  const cacheHitRatio = loadCacheHitRatio();
  const duplicateQueries = loadDuplicateQueries();
  const websocketChannels = loadWebsocketChannels();
  const memoryMb = loadMemoryMb();

  const linkedDb = canRunLinkedDb();
  const explainQueries = buildExplainQueries();

  let explainSummary = [];
  if (linkedDb) {
    explainSummary = explainQueries.map((q) => {
      const withRls = runExplainQuery(runSql, q, true);
      return {
        id: q.id,
        label: q.label,
        executionTimeMs: withRls.executionTimeMs ?? null,
        seqScan: withRls.seqScan ?? null,
      };
    });
  } else {
    const fallback = loadJson(join(RESULTS_DIR, "slow-query-audit.json"));
    if (fallback?.explainResults) {
      explainSummary = fallback.explainResults;
      warnings.push("EXPLAIN from slow-query-audit.json fallback");
    } else {
      warnings.push("Linked DB unavailable — serverExecutionMs may be null");
    }
  }

  const restBenchmark = await runRestBenchmarkSubset();
  if (!restBenchmark.ok) warnings.push(`REST: ${restBenchmark.error}`);

  const restById = Object.fromEntries((restBenchmark.results ?? []).map((r) => [r.id, r]));

  const routes = budgets.map((budget) => {
    const explain = budget.explainId ? explainSummary.find((e) => e.id === budget.explainId) : null;
    const rest = budget.restProxyId ? restById[budget.restProxyId] : null;
    return {
      route: budget.route,
      label: budget.label,
      payloadKb: rest?.bytesKb ?? null,
      queryCount: coldLoadQueryCount(budget),
      serverExecutionMs: explain?.executionTimeMs ?? null,
      hydrationMs: hydrationByRoute[budget.route] ?? null,
      clientComputeMs: null,
      bundleKb: bundle.firstLoadJsKb,
      cacheHitRatio,
      budget: {
        maxPayloadKb: budget.maxPayloadKb,
        maxQueries: budget.maxQueries,
        maxServerMs: budget.maxServerMs,
        maxHydrationMs: budget.maxHydrationMs,
        maxClientMs: budget.maxClientMs,
      },
      sources: {
        rest: rest?.id ?? null,
        explain: budget.explainId ?? null,
      },
    };
  });

  const snapshot = {
    generatedAt: new Date().toISOString(),
    linkedDbAvailable: linkedDb,
    warnings,
    routes,
    bundle,
    explainSummary,
    restBenchmark: restBenchmark.results ?? [],
    slowQueryAuditRef: existsSync(join(RESULTS_DIR, "slow-query-audit.json"))
      ? "test-results/slow-query-audit.json"
      : null,
    cacheHitRatio,
    duplicateQueries,
    websocketChannels,
    memoryMb,
  };

  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(snapshot, null, 2));

  if (REFRESH_BASELINE || !existsSync(BASELINE)) {
    writeFileSync(BASELINE, JSON.stringify({ ...snapshot, isBaseline: true }, null, 2));
    warnings.push(REFRESH_BASELINE ? "Refreshed performance-snapshot-baseline.json" : "Created performance-snapshot-baseline.json");
  }

  console.log(`performance-snapshot: wrote ${OUTPUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
