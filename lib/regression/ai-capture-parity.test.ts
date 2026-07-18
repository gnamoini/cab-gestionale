import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const lavLauncher = fs.readFileSync(
  path.join(ROOT, "components/document-capture/lavorazioni-digital-capture-launcher.tsx"),
  "utf8",
);
const ddtLauncher = fs.readFileSync(
  path.join(ROOT, "components/gestionale/magazzino/carichi/magazzino-carichi-capture-launcher.tsx"),
  "utf8",
);
const ddtReview = fs.readFileSync(
  path.join(ROOT, "components/gestionale/magazzino/carichi/receiving-review-panel.tsx"),
  "utf8",
);
const dropOverlay = fs.readFileSync(
  path.join(ROOT, "components/document-capture/lavorazioni-capture-drop-overlay.tsx"),
  "utf8",
);
const stepIndicator = fs.readFileSync(
  path.join(ROOT, "components/document-capture/document-capture-step-indicator.tsx"),
  "utf8",
);
const ddtStepIndicator = fs.readFileSync(
  path.join(ROOT, "components/gestionale/magazzino/carichi/inventory-receiving-step-indicator.tsx"),
  "utf8",
);

const SHELL_MARKERS = [
  "GestionaleCaptureStepIndicator",
  "DocumentUploadZone",
  "CaptureAcquisitionProgress",
  "DocumentCaptureReviewTable",
  "useInventoryReceivingApply",
  "inventoryReceivingCaptureAdapter",
] as const;

for (const marker of SHELL_MARKERS) {
  if (marker === "DocumentCaptureReviewTable") {
    assert.match(ddtReview, new RegExp(marker));
  } else if (
    marker === "useInventoryReceivingApply" ||
    marker === "inventoryReceivingCaptureAdapter" ||
    marker === "DocumentUploadZone" ||
    marker === "CaptureAcquisitionProgress"
  ) {
    assert.match(ddtLauncher, new RegExp(marker));
  }
}

// Lavorazioni shell
assert.match(lavLauncher, /DocumentCaptureStepIndicator/);
assert.match(stepIndicator, /GestionaleCaptureStepIndicator/);
assert.match(dropOverlay, /DocumentUploadZone/);
assert.match(lavLauncher, /LavorazioniCaptureDropOverlay/);

// DDT shell — must use shared components
assert.match(ddtLauncher, /InventoryReceivingStepIndicator/);
assert.match(ddtStepIndicator, /GestionaleCaptureStepIndicator/);
assert.match(ddtLauncher, /DocumentUploadZone/);
assert.match(ddtLauncher, /CaptureAcquisitionProgress/);
assert.match(ddtLauncher, /useInventoryReceivingApply/);
assert.match(ddtLauncher, /inventoryReceivingCaptureAdapter\.apply\.confirmLabel/);
assert.match(ddtReview, /DocumentCaptureReviewTable/);

// Adapters declared
assert.match(ddtLauncher, /inventoryReceivingCaptureAdapter/);

// No duplicated inline apply fetch in launcher
assert.doesNotMatch(ddtLauncher, /confirm-review/);

// Step indicator must be configurable (not hardcoded-only component)
assert.match(stepIndicator, /steps=/);
assert.match(ddtStepIndicator, /steps=/);

console.log("ai-capture-parity.test.ts OK");
