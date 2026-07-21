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
const stepIndicator = fs.readFileSync(
  path.join(ROOT, "components/document-capture/document-capture-step-indicator.tsx"),
  "utf8",
);
const lavAdapter = fs.readFileSync(
  path.join(ROOT, "lib/document-capture/lavorazioni-capture-adapter.ts"),
  "utf8",
);
const dropOverlay = fs.readFileSync(
  path.join(ROOT, "components/document-capture/lavorazioni-capture-drop-overlay.tsx"),
  "utf8",
);
const compileStep = fs.readFileSync(
  path.join(ROOT, "components/document-capture/capture-scheda-compile-step.tsx"),
  "utf8",
);
const matchStep = fs.readFileSync(
  path.join(ROOT, "components/document-capture/capture-mezzo-match-step.tsx"),
  "utf8",
);
const lavorazioniView = fs.readFileSync(
  path.join(ROOT, "components/gestionale/lavorazioni/lavorazioni-view.tsx"),
  "utf8",
);

assert.doesNotMatch(launcher, /DocumentCaptureHistoryPanel/);
assert.match(launcher, /DocumentCaptureStepIndicator/);
assert.match(launcher, /onBack=\{step !== "hub"/);
assert.match(launcher, /runCapturePipeline/);
assert.match(wizard, /Riprova lettura/);
assert.match(wizard, /Puoi riprovare tra/);
assert.match(wizard, /Controlla utilizzo API Gemini/);
assert.match(wizard, /GEMINI_API_USAGE_URL/);
assert.doesNotMatch(launcher, /Leggi documento/);
assert.doesNotMatch(launcher, /LavorazioneCreateModal/);
assert.doesNotMatch(launcher, /step === "confirm"/);
assert.doesNotMatch(launcher, /step === "review"/);
assert.doesNotMatch(launcher, /CaptureFieldReviewGrid/);
assert.match(launcher, /setStep\("compile"\)/);
assert.match(launcher, /CaptureSchedaCompileStep/);
assert.match(launcher, /CaptureMezzoMatchStep/);
assert.match(launcher, /CAPTURE_COMPILE_FORM_ID/);
assert.match(launcher, /Crea lavorazione/);
assert.doesNotMatch(launcher, /Controlla anteprima/);
assert.match(launcher, /onOpenSchedeFromCapture/);
assert.match(launcher, /schedeHandoffBusy/);
assert.match(launcher, /skipTableFocus/);

assert.match(stepIndicator, /"compile"/);
assert.doesNotMatch(stepIndicator, /"review"/);
assert.doesNotMatch(stepIndicator, /"confirm"/);
assert.match(lavAdapter, /Compila scheda/);

assert.match(wizard, /CaptureDocumentFilePreview/);
assert.match(compileStep, /CAPTURE_REVIEW_PIN_TOP_CLASS|--capture-review-pin-top/);
assert.match(compileStep, /pinned/);
assert.match(matchStep, /pinned/);
assert.match(matchStep, /Crea nuova lavorazione/);
assert.match(matchStep, /Assegna manualmente/);
assert.match(wizard, /DocumentCaptureAcquisitionProgress/);
assert.match(launcher, /deriveCaptureAcquisitionProgress/);
assert.doesNotMatch(wizard, /CaptureApplyPlanPreview/);
assert.doesNotMatch(wizard, /dry-run/);
assert.doesNotMatch(wizard, /GestionaleModalShell/);
assert.doesNotMatch(wizard, /Chiudi/);
assert.doesNotMatch(wizard, /DocumentCaptureWizardLauncher/);
assert.doesNotMatch(wizard, /CaptureFieldReviewGrid/);

assert.doesNotMatch(dropOverlay, />\s*Chiudi\s*</);
assert.match(dropOverlay, /DocumentUploadZone/);
assert.match(dropOverlay, /lavorazioniCaptureAdapter/);

assert.match(compileStep, /SchedaIngressoFormBody/);
assert.match(compileStep, /captureHints/);
assert.match(compileStep, /useLavorazioneCreateSubmit/);

assert.match(lavorazioniView, /onCaptureLavorazioneCreated/);
assert.match(lavorazioniView, /commitLavorazioneCreateSuccess/);
assert.match(lavorazioniView, /ensureSchedeBundlesInCache\(qc, \[id\]\)/);

console.log("document-capture-acquisition-ux.test.ts OK");
