import assert from "node:assert/strict";
import {
  runCaptureExecution,
  getInFlightCaptureExecution,
  cancelInFlightCaptureExecution,
} from "@/lib/document-capture/capture-execution-store";
import {
  CAPTURE_PIPELINE_VERSION,
  buildPipelineIdempotencySuffix,
} from "@/lib/document-capture/orchestrator/capture-pipeline-version";
import {
  capturePipelinePhaseRank,
  CAPTURE_PIPELINE_PHASE_RANKS,
} from "@/lib/document-capture/orchestrator/pipeline-types";
import {
  buildPipelineIdempotencyKey,
  assertPipelineCoherence,
} from "@/lib/document-capture/orchestrator/pipeline-orchestrator";
import { INITIAL_PIPELINE_STATE } from "@/lib/document-capture/model/pipeline-state";
import { markUploadUploaded } from "@/lib/document-capture/orchestrator/pipeline-state-advance";
import {
  createPipelineWatchdog,
  watchdogTimeoutCodeForPhase,
  PHASE_STALL_MS,
} from "@/lib/document-capture/orchestrator/pipeline-watchdog";
import { parseCaptureAnalyzeNdjsonLine } from "@/lib/document-capture/pipeline/analyze-stream-events";

// INV-01: verify phase exists in rank map
assert.equal(capturePipelinePhaseRank("verify"), 1);

// INV-02: read (physical_parse) after verify
assert.ok(capturePipelinePhaseRank("physical_parse") > capturePipelinePhaseRank("verify"));

// INV-03: AI after read
assert.ok(capturePipelinePhaseRank("ai_extract") > capturePipelinePhaseRank("physical_parse"));

// INV-04: projection after AI
assert.ok(capturePipelinePhaseRank("project") > capturePipelinePhaseRank("ai_extract"));

// INV-05: all orchestrator phases have ranks
for (const phase of Object.keys(CAPTURE_PIPELINE_PHASE_RANKS)) {
  assert.ok(capturePipelinePhaseRank(phase as keyof typeof CAPTURE_PIPELINE_PHASE_RANKS) > 0);
}

// INV-06: coherence — ai_extract requires uploaded
assert.throws(() => assertPipelineCoherence(INITIAL_PIPELINE_STATE, "ai_extract"));

// INV-07: upload marked before ai
const uploaded = markUploadUploaded(INITIAL_PIPELINE_STATE);
assert.doesNotThrow(() => assertPipelineCoherence(uploaded, "ai_extract"));

// INV-08: idempotency key includes pipeline version
const suffix = buildPipelineIdempotencySuffix({ pipelineVersion: CAPTURE_PIPELINE_VERSION, captureVersion: 3 });
assert.match(suffix, /pv/);
assert.match(suffix, /cv3/);
const key = buildPipelineIdempotencyKey("verify", "cap-1", suffix);
assert.match(key, /verify:cap-1/);

// INV-09: watchdog maps verify timeout
assert.equal(watchdogTimeoutCodeForPhase("verify"), "TIMEOUT_PHASE_VERIFY");
assert.equal(watchdogTimeoutCodeForPhase("physical_parse"), "TIMEOUT_PHASE_READ");

// INV-10: watchdog stall threshold
assert.equal(PHASE_STALL_MS, 90_000);

// INV-11: terminal event parses
const terminalLine = JSON.stringify({
  type: "terminal",
  terminalState: "completed",
  execution: {
    captureId: "c1",
    pipelineVersion: CAPTURE_PIPELINE_VERSION,
    executionId: "e1",
  },
  elapsedMs: 100,
});
const parsed = parseCaptureAnalyzeNdjsonLine(terminalLine);
assert.ok(parsed && parsed.type === "terminal" && parsed.terminalState === "completed");

// INV-12: CaptureExecutionStore dedup — same captureId returns same promise
async function testExecutionStoreDedup(): Promise<void> {
  let fetchCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCount += 1;
    return new Response(
      `${JSON.stringify({ type: "terminal", terminalState: "completed", execution: { captureId: "dedup-test", pipelineVersion: CAPTURE_PIPELINE_VERSION, executionId: "e1" }, elapsedMs: 1 })}\n${JSON.stringify({ type: "result", ok: true, body: { ok: true } })}\n`,
      { headers: { "Content-Type": "application/x-ndjson" } },
    );
  }) as typeof fetch;

  cancelInFlightCaptureExecution("dedup-test");
  const p1 = runCaptureExecution({ captureId: "dedup-test" });
  const p2 = runCaptureExecution({ captureId: "dedup-test" });
  assert.equal(p1, p2);
  await Promise.all([p1, p2]);
  assert.equal(fetchCount, 1);
  assert.ok(getInFlightCaptureExecution("dedup-test") === null);

  globalThis.fetch = originalFetch;
  cancelInFlightCaptureExecution("dedup-test");
}

void testExecutionStoreDedup().then(() => {
  console.log("document-capture-pipeline-invariants.test.ts OK");
});
