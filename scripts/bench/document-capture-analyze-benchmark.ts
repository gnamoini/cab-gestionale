#!/usr/bin/env npx tsx
/**
 * Aggrega righe DOCUMENT_CAPTURE_ANALYZE_TRACE da stdin o file log.
 * Uso: npm run bench:document-capture -- path/to/analyze.log
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
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
const reportPath = join(process.cwd(), "docs/perf/document-capture-benchmark-report.md");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");

const bottleneckRows = summary.bottlenecks
  .map((b) => `| ${b.phase} | ${b.meanMs} | ${b.p95Ms} | ${b.sharePct}% |`)
  .join("\n");

const phaseRows = Object.entries(summary.phases)
  .sort(([, a], [, b]) => b.meanMs - a.meanMs)
  .map(([phase, stats]) => `| ${phase} | ${stats.count} | ${stats.meanMs} | ${stats.p95Ms} | ${stats.p99Ms} |`)
  .join("\n");

const report = `# Document Capture Benchmark Report

Generated: ${summary.capturedAt}

## Summary

- Trace events: ${summary.sampleCount}
- Analyze runs: ${summary.runCount}
- Time to review ready (last END_OK elapsed): ${summary.uxMetrics.timeToReviewReadyMs ?? "n/a"} ms
- Time to first progress: ${summary.uxMetrics.timeToFirstProgressMs ?? "n/a"} ms
- Time to first data (PARSE_OK): ${summary.uxMetrics.timeToFirstDataMs ?? "n/a"} ms

## Bottlenecks (% of END_OK mean)

| Phase | Mean ms | P95 ms | Share |
|-------|---------|--------|-------|
${bottleneckRows || "| (no data) | — | — | — |"}

## All phases

| Phase | Count | Mean ms | P95 ms | P99 ms |
|-------|-------|---------|--------|--------|
${phaseRows || "| (no data) | — | — | — | — |"}

## Tokens (Gemini responses)

${summary.tokens ? `Mean input: ${summary.tokens.meanInput}, mean output: ${summary.tokens.meanOutput}` : "No token samples in trace."}

## Collection

- Production/staging: grep \`DOCUMENT_CAPTURE_ANALYZE_TRACE\` from runtime logs
- Local hybrid: \`DOCUMENT_CAPTURE_ANALYZE_TRACE=1 npx tsx scripts/bench/document-capture-analyze-runner.ts <file>\`
- Aggregate: \`npm run bench:document-capture -- analyze.log\`
`;

writeFileSync(reportPath, report, "utf8");
console.log(`Wrote ${outPath} (${samples.length} trace samples, ${summary.runCount} runs)`);
console.log(`Wrote ${reportPath}`);
