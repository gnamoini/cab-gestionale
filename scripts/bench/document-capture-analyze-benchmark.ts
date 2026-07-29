#!/usr/bin/env npx tsx
/**
 * Aggrega righe DOCUMENT_CAPTURE_ANALYZE_TRACE da stdin o file log.
 * Uso: npm run bench:document-capture -- path/to/analyze.log
 */
import { readFileSync } from "node:fs";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  parseAnalyzeTraceLogLine,
  summarizeAnalyzeTraceSamples,
} from "@/lib/document-capture/pipeline/analyze-benchmark-trace";
import { buildBenchmarkEnvironment } from "@/scripts/bench/benchmark-environment";

const inputPath = process.argv[2];
const raw = inputPath ? readFileSync(inputPath, "utf8") : readFileSync(0, "utf8");
const samples = raw
  .split(/\r?\n/)
  .map(parseAnalyzeTraceLogLine)
  .filter((s): s is NonNullable<typeof s> => s != null);

const summary = summarizeAnalyzeTraceSamples(samples);
const out = {
  environment: buildBenchmarkEnvironment({}),
  analyze: summary,
};

const outPath = join(process.cwd(), "docs/perf/document-capture-baseline.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
console.log(`Wrote ${outPath} (${samples.length} trace samples)`);
