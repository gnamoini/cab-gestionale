import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildReportAIContextDto } from "@/lib/report/ai-context/build-report-ai-context";
import type { InsightEvaluationResult } from "@/lib/report/insights/types";
import type { InsightTelemetrySummary } from "@/lib/report/insights/observability/insight-telemetry-summary";

const FORBIDDEN_IMPORTS = [
  /\bINSIGHT_RULE_REGISTRY\b/,
  /\bevaluateInsightRules\b/,
  /\bbuildAnalyticsDatasetBundle\b/,
  /\bbuildLavorazioniDataset\b/,
  /\bcreateClient\b/,
  /from\s+["']@supabase/,
  /rules\/.*\.rules/,
];

const AI_CONTEXT_DIR = path.join(process.cwd(), "lib/report/ai-context");

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "__tests__" && entry.name !== "api") {
      out.push(...collectTsFiles(abs));
    } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      out.push(abs);
    }
  }
  return out;
}

for (const file of collectTsFiles(AI_CONTEXT_DIR)) {
  const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
  const src = fs.readFileSync(file, "utf8");
  for (const re of FORBIDDEN_IMPORTS) {
    assert.doesNotMatch(src, re, `${rel} must not import forbidden module ${re}`);
  }
}

const builderSrc = fs.readFileSync(
  path.join(AI_CONTEXT_DIR, "build-report-ai-context.ts"),
  "utf8",
);
assert.doesNotMatch(builderSrc, /InsightDto/);

console.log("ai-context-input-boundary.test.ts OK");
