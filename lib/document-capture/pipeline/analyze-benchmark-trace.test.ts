import assert from "node:assert/strict";
import {
  groupAnalyzeTraceSamplesByRun,
  parseAnalyzeTraceLogLine,
  summarizeAnalyzeTraceSamples,
} from "@/lib/document-capture/pipeline/analyze-benchmark-trace";

const line = JSON.stringify({
  event: "DOCUMENT_CAPTURE_ANALYZE_TRACE",
  traceId: "trace-1",
  captureId: "cap-1",
  phase: "HYBRID_OK",
  durationMs: 1200,
  elapsedMs: 5000,
});

const sample = parseAnalyzeTraceLogLine(line);
assert.ok(sample);
assert.equal(sample?.phase, "HYBRID_OK");
assert.equal(sample?.traceId, "trace-1");

const endLine = JSON.stringify({
  event: "DOCUMENT_CAPTURE_ANALYZE_TRACE",
  traceId: "trace-1",
  captureId: "cap-1",
  phase: "END_OK",
  durationMs: 200,
  elapsedMs: 30000,
  inputTokens: 1000,
  outputTokens: 500,
});

const summary = summarizeAnalyzeTraceSamples([sample!, parseAnalyzeTraceLogLine(endLine)!]);
assert.equal(summary.runCount, 1);
assert.ok(summary.phases.HYBRID_OK);
assert.equal(summary.phases.HYBRID_OK?.p99Ms, 1200);
assert.ok(summary.phases.END_OK?.p99Ms >= 200);
assert.ok(summary.bottlenecks.length > 0);
assert.equal(groupAnalyzeTraceSamplesByRun([sample!, parseAnalyzeTraceLogLine(endLine)!]).size, 1);

console.log("analyze-benchmark-trace.test.ts OK");
