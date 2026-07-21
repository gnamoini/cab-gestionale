import assert from "node:assert/strict";
import {
  resolveCaptureApplyExecutionMode,
} from "@/lib/document-capture/capture-apply-execution-mode";

assert.equal(resolveCaptureApplyExecutionMode({ existingLavorazioneId: null }), "CREATE");
assert.equal(resolveCaptureApplyExecutionMode({ existingLavorazioneId: "" }), "CREATE");
assert.equal(resolveCaptureApplyExecutionMode({ existingLavorazioneId: "lav-1" }), "ASSIGN");
assert.equal(
  resolveCaptureApplyExecutionMode({ existingLavorazioneId: "lav-1", schedaTipo: "ingresso" }),
  "ASSIGN",
);
assert.equal(
  resolveCaptureApplyExecutionMode({ existingLavorazioneId: null, schedaTipo: "lavorazioni" }),
  "CREATE",
);

console.log("capture-apply-execution-mode.test.ts OK");
