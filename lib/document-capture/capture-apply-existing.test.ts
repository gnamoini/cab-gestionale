import assert from "node:assert/strict";
import { resolveCaptureApplyExecutionMode } from "@/lib/document-capture/capture-apply-execution-mode";

assert.equal(resolveCaptureApplyExecutionMode({ existingLavorazioneId: "lav-1", schedaTipo: "lavorazioni" }), "ASSIGN");
assert.equal(resolveCaptureApplyExecutionMode({ existingLavorazioneId: "lav-1", schedaTipo: "ingresso" }), "ASSIGN");
assert.equal(resolveCaptureApplyExecutionMode({ existingLavorazioneId: null, schedaTipo: "lavorazioni" }), "CREATE");

// ponytail: ASSIGN non richiede data ingresso dal capture — verificato dal mode resolver + pipeline dedicata
const assignMode = resolveCaptureApplyExecutionMode({ existingLavorazioneId: "lav-x", schedaTipo: "ricambi" });
assert.equal(assignMode, "ASSIGN");

console.log("capture-apply-existing.test.ts OK");
