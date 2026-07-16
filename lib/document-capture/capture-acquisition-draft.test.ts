import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

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

assert.match(launcher, /readCaptureAcquisitionDraft/);
assert.match(launcher, /saveCaptureAcquisitionDraft/);
assert.match(launcher, /clearCaptureAcquisitionDraft/);
assert.match(launcher, /captureAcquisitionDraftStillValid/);
assert.match(launcher, /Riprendere l'acquisizione/);
assert.match(launcher, /Riprendi/);
assert.match(launcher, /Ricomincia/);
assert.doesNotMatch(launcher, /discardCurrentCapture\(\);\s*setOpen\(false\)/);

console.log("capture-acquisition-draft.test.ts OK");
