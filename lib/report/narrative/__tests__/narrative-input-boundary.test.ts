import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildNarrativePromptContext } from "@/lib/report/narrative/build-narrative-prompt-context";

const FORBIDDEN_IMPORTS = [
  /\bINSIGHT_RULE_REGISTRY\b/,
  /\bevaluateInsightRules\b/,
  /\bbuildAnalyticsDatasetBundle\b/,
  /\bbuildLavorazioniDataset\b/,
  /\bcreateClient\b/,
  /from\s+["']@supabase/,
  /rules\/.*\.rules/,
];

const NARRATIVE_DIR = path.join(process.cwd(), "lib/report/narrative");

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (
      entry.isDirectory() &&
      entry.name !== "__tests__" &&
      entry.name !== "providers" &&
      entry.name !== "services" &&
      entry.name !== "contracts" &&
      entry.name !== "builders"
    ) {
      out.push(...collectTsFiles(abs));
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".test.ts") &&
      entry.name !== "index.ts"
    ) {
      out.push(abs);
    }
  }
  return out;
}

for (const file of collectTsFiles(NARRATIVE_DIR)) {
  const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
  const src = fs.readFileSync(file, "utf8");
  for (const re of FORBIDDEN_IMPORTS) {
    assert.doesNotMatch(src, re, `${rel} must not import forbidden module ${re}`);
  }
}

const builderSrc = fs.readFileSync(
  path.join(NARRATIVE_DIR, "build-narrative-prompt-context.ts"),
  "utf8",
);
assert.doesNotMatch(builderSrc, /InsightDto/);
assert.match(builderSrc, /buildNarrativePromptContext/);
assert.doesNotMatch(builderSrc, /ReportAIContextDto\[\]/);

// smoke: builder is callable
assert.equal(typeof buildNarrativePromptContext, "function");

console.log("narrative-input-boundary.test.ts OK");
