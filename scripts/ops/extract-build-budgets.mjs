/**
 * Extract JS/CSS budgets from Next.js build diagnostics.
 * Usage: node scripts/ops/extract-build-budgets.mjs [--gate]
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, normalize } from "node:path";

const ROOT = process.cwd();
const NEXT_DIR = join(ROOT, ".next");
const ROUTE_STATS = join(NEXT_DIR, "diagnostics", "route-bundle-stats.json");
const BUILD_MANIFEST = join(NEXT_DIR, "build-manifest.json");
const RESULTS_DIR = join(ROOT, "test-results");
const OUTPUT = join(RESULTS_DIR, "build-budget-snapshot.json");
const DIFF_OUTPUT = join(RESULTS_DIR, "build-budget-diff.json");
const GATE = process.argv.includes("--gate");

function loadJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

function loadActiveExceptions() {
  try {
    const raw = execFileSync("npx", ["tsx", "scripts/ops/export-budget-exceptions.ts"], {
      cwd: ROOT,
      encoding: "utf8",
      shell: true,
    });
    return JSON.parse(raw.replace(/^\uFEFF/, "")).exceptions ?? [];
  } catch {
    return [];
  }
}

function isBudgetExceptionActive(exceptions, route, metric) {
  return exceptions.some((e) => e.route === route && e.metric === metric);
}

function loadBudgets() {
  const raw = execFileSync("npx", ["tsx", "scripts/ops/export-performance-budgets.ts"], {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
  });
  return JSON.parse(raw.replace(/^\uFEFF/, ""));
}

function chunkSizeKb(relPath) {
  const normalized = relPath.replace(/\\/g, "/");
  const candidates = [
    join(ROOT, normalized),
    join(ROOT, ".next", normalized.replace(/^\.next\//, "")),
    join(NEXT_DIR, normalized.replace(/^\.next\//, "")),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return Math.round((statSync(p).size / 1024) * 10) / 10;
  }
  return 0;
}

function extractRouteStats() {
  const stats = loadJson(ROUTE_STATS) ?? [];
  const routeChunks = {};
  for (const entry of stats) {
    const route = entry.route;
    const jsKb = Math.round(((entry.firstLoadUncompressedJsBytes ?? 0) / 1024) * 10) / 10;
    routeChunks[route] = {
      jsKb,
      cssKb: 0,
      chunkCount: entry.firstLoadChunkPaths?.length ?? 0,
    };
  }
  return routeChunks;
}

function extractGlobalFirstLoad() {
  const manifest = loadJson(BUILD_MANIFEST);
  if (!manifest) return null;
  const files = [...(manifest.rootMainFiles ?? []), ...(manifest.polyfillFiles ?? [])];
  let total = 0;
  for (const rel of files) {
    total += chunkSizeKb(`static/${rel.replace(/^static\//, "")}`) * 1024;
  }
  if (total === 0 && existsSync(join(NEXT_DIR, "static", "chunks"))) {
    const stats = loadJson(ROUTE_STATS);
    const lav = stats?.find((s) => s.route === "/lavorazioni");
    if (lav?.firstLoadUncompressedJsBytes) {
      return Math.round((lav.firstLoadUncompressedJsBytes / 1024) * 10) / 10;
    }
  }
  return Math.round((total / 1024) * 10) / 10;
}

function largestChunkKb() {
  const chunksDir = join(NEXT_DIR, "static", "chunks");
  if (!existsSync(chunksDir)) return 0;
  let max = 0;
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (name.endsWith(".js")) max = Math.max(max, st.size);
    }
  };
  walk(chunksDir);
  return Math.round((max / 1024) * 10) / 10;
}

function main() {
  if (!existsSync(ROUTE_STATS)) {
    console.error("extract-build-budgets: missing route-bundle-stats — run npm run build first");
    process.exit(GATE ? 1 : 0);
  }

  const routeChunks = extractRouteStats();
  const firstLoadJsKb =
    Object.values(routeChunks).reduce((m, r) => Math.max(m, r.jsKb), 0) || extractGlobalFirstLoad();
  const vendorChunkKb = largestChunkKb();
  const snapshot = {
    generatedAt: new Date().toISOString(),
    firstLoadJsKb,
    vendorChunkKb,
    sharedChunksKb: firstLoadJsKb,
    routeChunks,
    source: normalize(ROUTE_STATS),
  };

  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(snapshot, null, 2));

  const { budgets } = loadBudgets();
  const globalRaw = readFileSync(join(ROOT, "lib/performance/performance-global-budgets.ts"), "utf8");
  const globalMatch = globalRaw.match(/GLOBAL_FIRST_LOAD_JS_KB\s*=\s*(\d+)/);
  const vendorMatch = globalRaw.match(/GLOBAL_VENDOR_CHUNK_KB\s*=\s*(\d+)/);
  const globalFirstLoadMax = globalMatch ? Number(globalMatch[1]) : 1900;
  const globalVendorMax = vendorMatch ? Number(vendorMatch[1]) : 800;

  const failures = [];
  const warnings = [];
  const exceptions = loadActiveExceptions();

  if (firstLoadJsKb > globalFirstLoadMax && !isBudgetExceptionActive(exceptions, "*", "firstLoadJsKb")) {
    failures.push({
      route: "*",
      metric: "firstLoadJsKb",
      value: firstLoadJsKb,
      max: globalFirstLoadMax,
      message: `Global first load ${firstLoadJsKb}KB > ${globalFirstLoadMax}KB`,
    });
  }
  if (vendorChunkKb > globalVendorMax && !isBudgetExceptionActive(exceptions, "*", "vendorChunkKb")) {
    failures.push({
      route: "*",
      metric: "vendorChunkKb",
      value: vendorChunkKb,
      max: globalVendorMax,
      message: `Largest chunk ${vendorChunkKb}KB > ${globalVendorMax}KB`,
    });
  }

  for (const budget of budgets) {
    const routeStats = routeChunks[budget.route];
    if (!routeStats) continue;
    const maxJs = budget.maxFirstLoadJsKb ?? globalFirstLoadMax;
    if (routeStats.jsKb > maxJs && !isBudgetExceptionActive(exceptions, budget.route, "maxFirstLoadJsKb")) {
      failures.push({
        route: budget.route,
        metric: "maxFirstLoadJsKb",
        value: routeStats.jsKb,
        max: maxJs,
        message: `${budget.route} first load ${routeStats.jsKb}KB > ${maxJs}KB`,
      });
    }
  }

  const diff = { generatedAt: snapshot.generatedAt, failures, warnings, snapshot: { firstLoadJsKb, vendorChunkKb } };
  writeFileSync(DIFF_OUTPUT, JSON.stringify(diff, null, 2));

  console.log(`extract-build-budgets: wrote ${OUTPUT}`);
  console.log(`extract-build-budgets: firstLoadJsKb=${firstLoadJsKb} vendorChunkKb=${vendorChunkKb}`);

  if (GATE && failures.length > 0) {
    for (const f of failures) console.error(`FAIL: ${f.message}`);
    process.exit(1);
  }
}

main();
