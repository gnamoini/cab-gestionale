import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const ddtLauncher = fs.readFileSync(
  path.join(ROOT, "components/gestionale/magazzino/carichi/magazzino-carichi-capture-launcher.tsx"),
  "utf8",
);
const progressPanel = fs.readFileSync(
  path.join(ROOT, "components/document-capture/capture-acquisition-progress-panel.tsx"),
  "utf8",
);
const adapter = fs.readFileSync(
  path.join(ROOT, "lib/document-capture/inventory-receiving-capture-adapter.ts"),
  "utf8",
);
const reviewTable = fs.readFileSync(
  path.join(ROOT, "components/document-capture/document-capture-review-table.tsx"),
  "utf8",
);
const stepIndicator = fs.readFileSync(
  path.join(ROOT, "components/document-capture/gestionale-capture-step-indicator.tsx"),
  "utf8",
);

// Structural markers (not pixel screenshots)
assert.match(ddtLauncher, /aria-label="Acquisizione DDT con AI"/);
assert.match(ddtLauncher, /inventoryReceivingCaptureAdapter\.apply\.confirmLabel/);
assert.match(progressPanel, /role="status"/);
assert.match(reviewTable, /GestionaleListTable/);
assert.match(stepIndicator, /aria-label=/);
assert.match(stepIndicator, /aria-current=\{active \? "step"/);
assert.match(adapter, /Conferma importazione/);

console.log("document-capture-capture-structure.test.ts OK");
