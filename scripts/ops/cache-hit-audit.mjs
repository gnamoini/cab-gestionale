/**
 * Summarize dev query fetch counters (browser console: window.__cabQueryFetchAudit()).
 * For CI/docs: paste JSON export or run after manual navigation in dev.
 *
 * Usage:
 *   node scripts/ops/cache-hit-audit.mjs [path-to-export.json]
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const inputPath = process.argv[2];
const outDir = join(process.cwd(), "test-results");
const outPath = join(outDir, "cache-hit-audit-summary.json");

let rows = [];

if (inputPath && existsSync(inputPath)) {
  const raw = JSON.parse(readFileSync(inputPath, "utf8"));
  rows = Array.isArray(raw) ? raw : raw.counts ?? [];
} else {
  console.log(
    "No input JSON. In dev, run window.__cabQueryFetchAudit() in browser and save output, then:",
  );
  console.log("  node scripts/ops/cache-hit-audit.mjs test-results/cache-fetch-counts.json");
  rows = [];
}

const totalFetches = rows.reduce((sum, r) => sum + (r.fetches ?? 0), 0);
const settingsFetches = rows
  .filter((r) => String(r.queryKey).includes("app_settings") || String(r.queryKey).includes('"settings"'))
  .reduce((sum, r) => sum + (r.fetches ?? 0), 0);

const summary = {
  generatedAt: new Date().toISOString(),
  source: inputPath ?? null,
  totalFetches,
  settingsFetches,
  topQueries: [...rows].sort((a, b) => (b.fetches ?? 0) - (a.fetches ?? 0)).slice(0, 20),
  notes: [
    "Post STATIC tier: settings payload should fetch once per session (owner provider).",
    "Dashboard lavorazioni attive/chiuse: expect 1 fetch for attive on cold load (chiuse deferred).",
    "Full classification: node scripts/ops/query-frequency-audit.mjs test-results/cache-fetch-counts.json",
  ],
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
