import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const FORBIDDEN_IMPORTS = [
  /\bINSIGHT_RULE_REGISTRY\b/,
  /\bevaluateInsightRules\b/,
  /\bbuildAnalyticsDatasetBundle\b/,
  /\bbuildLavorazioniDataset\b/,
  /\bcreateClient\b/,
  /from\s+["']@supabase/,
  /rules\/.*\.rules/,
];

const QUALITY_DIR = path.join(process.cwd(), "lib/report/narrative/quality");

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "__tests__") {
      out.push(...collectTsFiles(abs));
    } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      out.push(abs);
    }
  }
  return out;
}

for (const file of collectTsFiles(QUALITY_DIR)) {
  const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
  const src = fs.readFileSync(file, "utf8");
  for (const re of FORBIDDEN_IMPORTS) {
    assert.doesNotMatch(src, re, `${rel} must not import forbidden module ${re}`);
  }
}

console.log("narrative-quality-boundary.test.ts OK");
