import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FORBIDDEN = [
  /\bbuildReportCrossDto\b/,
  /\bbuildCrossAnalytics\b/,
  /from\s+["']@\/lib\/report\/cross-analysis["']/,
];

function collectFiles(dir: string, relPrefix: string): { rel: string; src: string }[] {
  if (!fs.existsSync(dir)) return [];
  const out: { rel: string; src: string }[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = `${relPrefix}/${entry.name}`.replace(/\\/g, "/");
    if (entry.isDirectory()) {
      out.push(...collectFiles(abs, rel));
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      out.push({ rel, src: fs.readFileSync(abs, "utf8") });
    }
  }
  return out;
}

const scopes = [
  { dir: path.join(ROOT, "components"), prefix: "components" },
  { dir: path.join(ROOT, "app"), prefix: "app" },
];

for (const { dir, prefix } of scopes) {
  for (const { rel, src } of collectFiles(dir, prefix)) {
    for (const re of FORBIDDEN) {
      assert.doesNotMatch(src, re, `${rel} must not reference forbidden cross layer ${re}`);
    }
  }
}

console.log("cross-analysis-import-boundary.test.ts OK");
