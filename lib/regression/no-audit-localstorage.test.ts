import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES_TO_SCAN = [
  "components/gestionale/documenti/documenti-view.tsx",
  "components/preventivi/preventivi-view.tsx",
  "components/preventivi/preventivi-editor-modal.tsx",
  "components/gestionale/magazzino/magazzino-view.tsx",
];

const FORBIDDEN = [
  /appendPreventiviChangeLog\s*\(/,
  /appendDocumentiChangeLog\s*\(/,
  /saveMagazzinoChangeLog\s*\(/,
  /loadMagazzinoChangeLog\s*\(/,
];

for (const rel of FILES_TO_SCAN) {
  const content = fs.readFileSync(path.join(ROOT, rel), "utf8");
  for (const re of FORBIDDEN) {
    assert.doesNotMatch(content, re, `${rel} must not use audit localStorage helpers`);
  }
}

console.log("no-audit-localstorage.test.ts OK");
