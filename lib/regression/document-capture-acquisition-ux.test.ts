import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const launcher = fs.readFileSync(
  path.join(ROOT, "components/document-capture/lavorazioni-digital-capture-launcher.tsx"),
  "utf8",
);
const wizard = fs.readFileSync(
  path.join(ROOT, "components/document-capture/document-capture-wizard-modal.tsx"),
  "utf8",
);
const dropOverlay = fs.readFileSync(
  path.join(ROOT, "components/document-capture/lavorazioni-capture-drop-overlay.tsx"),
  "utf8",
);

assert.doesNotMatch(launcher, /DocumentCaptureHistoryPanel/);
assert.match(launcher, /DocumentCaptureStepIndicator/);
assert.match(launcher, /onBack=\{step !== "hub"/);
assert.match(launcher, /runCapturePipeline/);
assert.match(wizard, /Riprova lettura/);
assert.doesNotMatch(launcher, /Leggi documento/);
assert.match(launcher, /LavorazioneCreateModal/);
assert.doesNotMatch(launcher, /Controlla anteprima/);
assert.match(launcher, /CaptureIngressoMissingDialog/);
assert.match(launcher, /CaptureLavorazioneAssignConfirmDialog/);
assert.match(launcher, /findActiveLavorazioneWithIngressoForCaptureIdent/);
const reviewGrid = fs.readFileSync(
  path.join(ROOT, "components/document-capture/capture-field-review-grid.tsx"),
  "utf8",
);

assert.match(launcher, /catalogValidation/);
assert.match(launcher, /CaptureEntityAmbiguityDialog/);
assert.match(launcher, /entity-resolution/);
assert.match(launcher, /onOpenSchedeFromCapture/);
assert.match(launcher, /schedeHandoffBusy/);
assert.match(launcher, /skipTableFocus/);

assert.match(wizard, /CaptureDocumentFilePreview/);
assert.match(wizard, /DocumentCaptureAcquisitionProgress/);
assert.match(launcher, /deriveCaptureAcquisitionProgress/);
assert.doesNotMatch(wizard, /CaptureApplyPlanPreview/);
assert.doesNotMatch(wizard, /dry-run/);
assert.doesNotMatch(wizard, /GestionaleModalShell/);
assert.doesNotMatch(wizard, /Chiudi/);
assert.doesNotMatch(wizard, /DocumentCaptureWizardLauncher/);

assert.doesNotMatch(dropOverlay, />\s*Chiudi\s*</);
assert.match(dropOverlay, /DOCUMENT_CAPTURE_UPLOAD_ACCEPT/);
assert.match(dropOverlay, /DOCUMENT_CAPTURE_UPLOAD_FORMAT_HINT/);

console.log("document-capture-acquisition-ux.test.ts OK");
