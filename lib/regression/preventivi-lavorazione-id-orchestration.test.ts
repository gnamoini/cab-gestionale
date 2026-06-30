import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const viewSrc = fs.readFileSync(path.join(ROOT, "components/preventivi/preventivi-view.tsx"), "utf8");

assert.match(
  viewSrc,
  /void appendPreventivoSynced\(rec, mezziRows[\s\S]*?sp\.set\(Q_PREVENTIVI_OPEN, saved\.id\)[\s\S]*?router\.replace/,
);
assert.doesNotMatch(viewSrc, /sp\.set\(Q_PREVENTIVI_OPEN, rec\.id\)/);
assert.match(viewSrc, /pendingHandledRef\.current = false/);
assert.match(viewSrc, /editor\.open && editor\.isRollbackDraft/);

console.log("preventivi-lavorazione-id-orchestration.test.ts OK");
