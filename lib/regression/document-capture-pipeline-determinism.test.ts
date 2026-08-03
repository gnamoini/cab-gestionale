import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const orchestrator = fs.readFileSync(
  path.join(ROOT, "lib/document-capture/orchestrator/run-capture-pipeline.server.ts"),
  "utf8",
);
const processCapture = fs.readFileSync(
  path.join(ROOT, "lib/document-capture/pipeline/process-capture.server.ts"),
  "utf8",
);
const executionStore = fs.readFileSync(
  path.join(ROOT, "lib/document-capture/capture-execution-store.ts"),
  "utf8",
);
const wizard = fs.readFileSync(
  path.join(ROOT, "components/document-capture/document-capture-wizard-modal.tsx"),
  "utf8",
);
const progressPanel = fs.readFileSync(
  path.join(ROOT, "components/document-capture/capture-acquisition-progress-panel.tsx"),
  "utf8",
);
const analyzeRoute = fs.readFileSync(
  path.join(ROOT, "app/api/document-capture/[id]/analyze/route.ts"),
  "utf8",
);

assert.match(orchestrator, /runCapturePipeline/);
assert.match(orchestrator, /ensureTerminal/);
assert.match(orchestrator, /ANALYZE_IN_PROGRESS/);
assert.match(processCapture, /runCapturePipeline/);
assert.match(executionStore, /runCaptureExecution/);
assert.match(executionStore, /inFlight\.get/);
assert.doesNotMatch(progressPanel, /useCreepingProgress/);
assert.doesNotMatch(progressPanel, /setInterval/);
assert.match(wizard, /capture-execution-store/);
assert.match(wizard, /terminalState/);
assert.match(analyzeRoute, /410/);
assert.match(analyzeRoute, /DEPRECATED_ENDPOINT/);

console.log("document-capture-pipeline-determinism.test.ts OK");
