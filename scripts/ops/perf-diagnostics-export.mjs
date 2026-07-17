/**
 * Export dev diagnostics snapshot to test-results.
 * Usage: node scripts/ops/perf-diagnostics-export.mjs [path-to-export.json]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const input = process.argv[2] ?? join(ROOT, "test-results", "perf-diagnostics-export.json");
const out = join(ROOT, "test-results", "perf-diagnostics-snapshot.json");

if (!existsSync(input)) {
  console.error(`perf-diagnostics-export: missing ${input}`);
  process.exit(1);
}

const data = JSON.parse(readFileSync(input, "utf8").replace(/^\uFEFF/, ""));
mkdirSync(join(ROOT, "test-results"), { recursive: true });
writeFileSync(
  out,
  JSON.stringify({ generatedAt: new Date().toISOString(), ...data }, null, 2),
);
console.log(`perf-diagnostics-export: wrote ${out}`);
