import assert from "node:assert/strict";
import { deriveCaptureAcquisitionProgress } from "@/lib/document-capture/capture-acquisition-progress";

const uploading = deriveCaptureAcquisitionProgress({
  uploadPhase: "uploading",
  uploadProgress: 0.5,
  analyzeBusy: false,
});
assert.equal(uploading.phase, "uploading");
assert.equal(uploading.label, "Caricamento documento…");
assert.ok(uploading.progress > 20 && uploading.progress < 30);

const finalizing = deriveCaptureAcquisitionProgress({
  uploadPhase: "finalizing",
  uploadProgress: 0.7,
  analyzeBusy: false,
});
assert.equal(finalizing.phase, "finalizing");
assert.equal(finalizing.label, "Verifica documento…");

const reading = deriveCaptureAcquisitionProgress({
  uploadPhase: "success",
  uploadProgress: 1,
  analyzeBusy: true,
});
assert.equal(reading.phase, "reading");
assert.equal(reading.creeping, false);
assert.equal(reading.streamActive, true);
assert.equal(reading.label, "Lettura documento con AI…");

const checklist = deriveCaptureAcquisitionProgress({
  uploadPhase: "success",
  uploadProgress: 1,
  analyzeBusy: true,
  analyzePhase: "GEMINI_REQUEST",
  useChecklist: true,
  heartbeatAt: Date.now() - 8000,
});
assert.equal(checklist.streamActive, true);
assert.equal(checklist.creeping, false);
assert.ok(Array.isArray(checklist.checklist));
assert.ok(checklist.checklist!.some((c) => c.active));
assert.ok(checklist.heartbeatLabel?.includes("s fa"));

console.log("capture-acquisition-progress.test.ts OK");
