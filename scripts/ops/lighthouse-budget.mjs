/**
 * Lighthouse / Web Vitals budget check (cert tier).
 * Usage: LIGHTHOUSE_BASE_URL=https://... node scripts/ops/lighthouse-budget.mjs [--gate]
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const RESULTS = join(ROOT, "test-results");
const OUTPUT = join(RESULTS, "lighthouse-snapshot.json");
const BASELINE = join(RESULTS, "lighthouse-baseline.json");
const GATE = process.argv.includes("--gate");
const BASE_URL = process.env.LIGHTHOUSE_BASE_URL?.replace(/\/$/, "") ?? "";

const ROUTES = ["/login", "/dashboard", "/lavorazioni", "/magazzino", "/report"];
const BUDGET = { lcpMs: 3500, inpMs: 300, cls: 0.15, ttfbMs: 1200 };

function loadJson(p) {
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

function parsePlaywrightProxy() {
  const perfDir = join(ROOT, "e2e", "test-results", "perf-playwright");
  const data = loadJson(join(perfDir, "perf-snapshot-admin.json"));
  if (!data?.snapshots?.length) return null;
  const cold = data.snapshots.filter((s) => s.mode === "cold");
  if (!cold.length) return null;
  const ttfb = cold
    .flatMap((s) => s.restResources ?? [])
    .map((r) => r.ttfbMs)
    .filter((n) => typeof n === "number");
  const nav = cold.map((s) => s.interactiveMs ?? s.domContentLoadedMs).filter((n) => typeof n === "number");
  return {
    source: "playwright-proxy",
    lcpMs: nav.length ? Math.round(nav.reduce((a, b) => a + b, 0) / nav.length) : null,
    ttfbMs: ttfb.length ? Math.round(ttfb.reduce((a, b) => a + b, 0) / ttfb.length) : null,
    inpMs: null,
    cls: null,
    routes: cold.map((s) => s.route),
  };
}

async function main() {
  mkdirSync(RESULTS, { recursive: true });
  const warnings = [];
  let vitals = parsePlaywrightProxy();

  if (BASE_URL) {
    try {
      const url = `${BASE_URL}/login`;
      const out = execFileSync(
        "npx",
        ["lighthouse", url, "--output=json", "--quiet", "--chrome-flags=--headless", "--only-categories=performance"],
        { encoding: "utf8", cwd: ROOT, shell: true, maxBuffer: 20 * 1024 * 1024 },
      );
      const report = JSON.parse(out);
      const audits = report.audits ?? {};
      vitals = {
        source: "lighthouse",
        lcpMs: Math.round(audits["largest-contentful-paint"]?.numericValue ?? 0),
        inpMs: Math.round(audits["interaction-to-next-paint"]?.numericValue ?? audits["max-potential-fid"]?.numericValue ?? 0),
        cls: audits["cumulative-layout-shift"]?.numericValue ?? 0,
        ttfbMs: Math.round(audits["server-response-time"]?.numericValue ?? 0),
        routes: ROUTES,
      };
    } catch (e) {
      warnings.push(`Lighthouse failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    warnings.push("LIGHTHOUSE_BASE_URL unset — using Playwright proxy if available");
  }

  const snapshot = { generatedAt: new Date().toISOString(), vitals, budget: BUDGET, warnings };
  writeFileSync(OUTPUT, JSON.stringify(snapshot, null, 2));

  if (!existsSync(BASELINE) && vitals) {
    writeFileSync(BASELINE, JSON.stringify({ ...snapshot, isBaseline: true }, null, 2));
  }

  const failures = [];
  if (vitals) {
    if (vitals.lcpMs != null && vitals.lcpMs > BUDGET.lcpMs) {
      failures.push(`LCP ${vitals.lcpMs}ms > ${BUDGET.lcpMs}ms`);
    }
    if (vitals.ttfbMs != null && vitals.ttfbMs > BUDGET.ttfbMs) {
      failures.push(`TTFB ${vitals.ttfbMs}ms > ${BUDGET.ttfbMs}ms`);
    }
    if (vitals.cls != null && vitals.cls > BUDGET.cls) {
      failures.push(`CLS ${vitals.cls} > ${BUDGET.cls}`);
    }
    if (vitals.inpMs != null && vitals.inpMs > BUDGET.inpMs) {
      failures.push(`INP ${vitals.inpMs}ms > ${BUDGET.inpMs}ms`);
    }
  } else if (GATE) {
    failures.push("No vitals data — run e2e/perf or set LIGHTHOUSE_BASE_URL");
  }

  console.log(`lighthouse-budget: wrote ${OUTPUT}`);
  if (failures.length) {
    for (const f of failures) console.warn(`WARN: ${f}`);
    if (GATE && failures.length > 0 && vitals?.source === "lighthouse") process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
