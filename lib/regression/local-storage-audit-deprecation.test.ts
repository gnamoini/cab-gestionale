import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const drawers = [
  "components/preventivi/preventivi-view.tsx",
  "components/gestionale/documenti/documenti-view.tsx",
  "components/fatturazione/fatturazione-view.tsx",
];

for (const rel of drawers) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  assert.match(src, /useLogListQuery|useUndoableLog/, `${rel} must use server log SSOT`);
  assert.doesNotMatch(src, /readLocal.*ChangeLog|loadPreventiviChangeLog|loadDocumentiChangeLog/, rel);
}

const batcher = fs.readFileSync(
  path.join(ROOT, "src/services/internal/log-modifiche-batcher.ts"),
  "utf8",
);
assert.doesNotMatch(batcher, /@deprecated/);

const deprecatedCaches = [
  "lib/preventivi/preventivi-change-log-storage.ts",
  "lib/documenti/documenti-change-log-storage.ts",
  "lib/magazzino/magazzino-change-log-storage.ts",
  "lib/lavorazioni/lavorazioni-change-log.ts",
];
for (const rel of deprecatedCaches) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  assert.match(src, /@deprecated/, rel);
}

console.log("local-storage-audit-deprecation.test.ts OK");
