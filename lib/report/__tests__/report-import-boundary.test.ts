import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

/** Pre-S0 legacy: owner typed against ReportSectionId from components. */
const METRICS_LEGACY_ALLOWLIST = new Set([
  "lib/report/metrics/report-metric-registry.ts",
  "lib/report/metrics/report-metric-types.ts",
]);

function readTsFiles(dir: string): { rel: string; src: string }[] {
  if (!fs.existsSync(dir)) return [];
  const out: { rel: string; src: string }[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...readTsFiles(abs).map((f) => ({ ...f, rel: path.join(entry.name, f.rel) })));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      const rel = path.relative(ROOT, abs).replace(/\\/g, "/");
      out.push({ rel, src: fs.readFileSync(abs, "utf8") });
    }
  }
  return out;
}

const FORBIDDEN = [
  /from\s+["']@\/components\//,
  /from\s+["']components\//,
  /require\s*\(\s*["']@\/components\//,
];

for (const relRoot of ["lib/report/contracts", "lib/report/metrics"]) {
  const absRoot = path.join(ROOT, relRoot);
  for (const entry of fs.readdirSync(absRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      const rel = `${relRoot}/${entry.name}`;
      const src = fs.readFileSync(path.join(absRoot, entry.name), "utf8");
      if (relRoot === "lib/report/metrics" && METRICS_LEGACY_ALLOWLIST.has(rel)) continue;
      for (const re of FORBIDDEN) {
        assert.doesNotMatch(src, re, `${rel} must not import components (${re})`);
      }
    }
  }
  if (relRoot === "lib/report/contracts") {
    for (const { rel, src } of readTsFiles(absRoot)) {
      const fullRel = rel.startsWith("lib/") ? rel : `${relRoot}/${rel}`;
      for (const re of FORBIDDEN) {
        assert.doesNotMatch(src, re, `${fullRel} must not import components (${re})`);
      }
    }
  }
}

console.log("report-import-boundary.test.ts OK");
