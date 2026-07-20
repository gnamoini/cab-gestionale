import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const executiveDir = path.join(ROOT, "components/report/executive");

const HOOK_ALLOWLIST = new Set([
  "components/report/executive/hooks/use-report-executive.ts",
]);

function readExecutiveFiles(dir: string, rel = ""): { rel: string; src: string }[] {
  if (!fs.existsSync(dir)) return [];
  const out: { rel: string; src: string }[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const fileRel = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...readExecutiveFiles(abs, fileRel));
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      const fullRel = `components/report/executive/${fileRel}`.replace(/\\/g, "/");
      out.push({ rel: fullRel, src: fs.readFileSync(abs, "utf8") });
    }
  }
  return out;
}

const files = readExecutiveFiles(executiveDir);

for (const { rel, src } of files) {
  if (HOOK_ALLOWLIST.has(rel)) continue;

  for (const re of [
    /from\s+["']@\/lib\/report\/datasets/,
    /from\s+["']@\/lib\/report\/metrics\/report-metric-registry/,
    /from\s+["']@\/lib\/report\/metrics\/resolve-metric-id/,
    /from\s+["']@\/lib\/report\/executive["']/,
    /\bbuildReportExecutiveDto\b/,
    /\bnormalizeExecutiveSlices\b/,
    /\bEXECUTIVE_METRIC_REGISTRY\b/,
    /\bresolveCanonicalMetricId\b/,
  ]) {
    assert.doesNotMatch(src, re, `${rel} must not import forbidden layer ${re}`);
  }
}

const hookPath = path.join(ROOT, "components/report/executive/hooks/use-report-executive.ts");
const hookSrc = fs.readFileSync(hookPath, "utf8");
assert.doesNotMatch(hookSrc, /\bbuildReportExecutiveDto\b/);
assert.doesNotMatch(hookSrc, /from\s+["']@\/lib\/report\/datasets/);
assert.doesNotMatch(hookSrc, /from\s+["']@\/lib\/report\/executive["']/);
assert.match(hookSrc, /from\s+["']@\/lib\/report\/executive\/types["']/);

console.log("executive-components-import-boundary.test.ts OK");
