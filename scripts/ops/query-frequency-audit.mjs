/**
 * Query frequency audit — duplicate / unnecessary / frequent / low hit ratio.
 * Usage: node scripts/ops/query-frequency-audit.mjs [cache-fetch-counts.json] [dedup-export.json]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const fetchPath = process.argv[2] ?? join(process.cwd(), "test-results", "cache-fetch-counts.json");
const dedupPath = process.argv[3];
const inventoryPath = join(process.cwd(), "scripts", "ops", "query-inventory.json");
const outPath = join(process.cwd(), "test-results", "query-frequency-audit.json");

function loadJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

const inventory = loadJson(inventoryPath);
const fetchRows = loadJson(fetchPath);
const dedupExport = dedupPath ? loadJson(dedupPath) : null;

const counts = Array.isArray(fetchRows) ? fetchRows : fetchRows?.counts ?? [];

const duplicate = counts.filter((r) => (r.fetches ?? 0) > 1).map((r) => ({
  queryKey: r.queryKey,
  fetches: r.fetches,
  class: "duplicate",
}));

const avoidableInventory = (inventory?.queries ?? []).filter((q) => q.avoidable);
const unnecessary = [];
for (const q of avoidableInventory) {
  const match = counts.find((r) => String(r.queryKey).includes(q.table ?? q.label));
  if (match && (match.fetches ?? 0) > 0) {
    unnecessary.push({
      label: q.label,
      area: q.area,
      fetches: match.fetches,
      sourceFile: q.sourceFile,
      class: "unnecessary",
    });
  }
}

const tooFrequent = counts
  .filter((r) => (r.fetches ?? 0) > 3)
  .map((r) => ({
    queryKey: r.queryKey,
    fetches: r.fetches,
    class: "tooFrequent",
  }));

const totalFetches = counts.reduce((s, r) => s + (r.fetches ?? 0), 0);
const dedupSkips = dedupExport?.skips ?? dedupExport?.dedupHitSkips ?? 0;
const lowHitRatio =
  totalFetches > 0 && dedupSkips / (totalFetches + dedupSkips) < 0.1
    ? [{ totalFetches, dedupSkips, ratio: dedupSkips / (totalFetches + dedupSkips), class: "lowHitRatio" }]
    : [];

const out = {
  generatedAt: new Date().toISOString(),
  sources: {
    inventory: inventoryPath,
    fetchCounts: existsSync(fetchPath) ? fetchPath : null,
    dedup: dedupPath && existsSync(dedupPath) ? dedupPath : null,
  },
  totalFetches,
  dedupSkips,
  duplicate,
  unnecessary,
  tooFrequent,
  lowHitRatio,
  topQueries: [...counts].sort((a, b) => (b.fetches ?? 0) - (a.fetches ?? 0)).slice(0, 20),
};

mkdirSync(join(process.cwd(), "test-results"), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`query-frequency-audit: wrote ${outPath}`);
console.log(JSON.stringify(out, null, 2));
