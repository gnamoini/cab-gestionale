import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  captureAcquisitionResumeTargetStep,
} from "@/lib/document-capture/capture-acquisition-draft";

const ROOT = process.cwd();

const launcher = fs.readFileSync(
  path.join(ROOT, "components/document-capture/lavorazioni-digital-capture-launcher.tsx"),
  "utf8",
);
const draft = fs.readFileSync(
  path.join(ROOT, "lib/document-capture/capture-acquisition-draft.ts"),
  "utf8",
);

assert.match(draft, /sessionStorage/);
assert.match(draft, /readCaptureAcquisitionDraft/);
assert.match(draft, /saveCaptureAcquisitionDraft/);
assert.match(draft, /clearCaptureAcquisitionDraft/);
assert.match(draft, /captureAcquisitionDraftStillValid/);
assert.match(draft, /ingressoCompile/);
assert.match(draft, /captureAcquisitionResumeTargetStep/);

assert.match(draft, /linkedLavorazioneId/);
assert.match(draft, /pendingAssignLavorazioneId/);
assert.match(draft, /fieldsRes\.ok/);

assert.match(launcher, /readCaptureAcquisitionDraft/);
assert.match(launcher, /saveCaptureAcquisitionDraft/);
assert.match(launcher, /persistAcquisitionDraft/);
assert.match(launcher, /resumeIngressoCompile/);
assert.match(launcher, /onIngressoCompileChange/);
assert.match(launcher, /loadCompileFieldRows/);
assert.match(launcher, /const goBack = useCallback\(\(\) => \{[\s\S]*handleClose\(\)/);
assert.match(launcher, /Riprendere l'acquisizione/);
assert.match(launcher, /Riprendi/);
assert.match(launcher, /Ricomincia/);
assert.match(launcher, /skipAcquisitionDraftPersistRef/);
assert.match(launcher, /finalizeCaptureImportSuccess/);
assert.doesNotMatch(launcher, /discardCurrentCapture\(\);\s*setOpen\(false\)/);

assert.equal(captureAcquisitionResumeTargetStep("compile", "analyzing"), "compile");
assert.equal(captureAcquisitionResumeTargetStep("analyze", "review"), "compile");
assert.equal(captureAcquisitionResumeTargetStep("analyze", "analyzing"), "analyze");

console.log("capture-acquisition-draft.test.ts OK");
