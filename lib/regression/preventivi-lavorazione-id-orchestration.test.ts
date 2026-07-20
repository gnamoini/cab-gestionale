import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const viewSrc = fs.readFileSync(path.join(ROOT, "components/preventivi/preventivi-view.tsx"), "utf8");

assert.match(
  viewSrc,
  /void dedupePendingPreventivoAppend\(async \(\) => \{[\s\S]*?buildNewPreventivoFromLavorazioneContext\([\s\S]*?clearPendingPreventivoPayload\(\)[\s\S]*?isNew: true/,
);
assert.doesNotMatch(viewSrc, /appendPreventivoSynced\(rec, mezzi/);
assert.doesNotMatch(viewSrc, /sp\.set\(Q_PREVENTIVI_OPEN, rec\.id\)/);
assert.match(viewSrc, /peekPendingPreventivoPayload/);
assert.match(viewSrc, /schedeHandoffLoading/);
assert.match(viewSrc, /Importazione dati dalle schede/);
assert.match(viewSrc, /editor\.open && editor\.isRollbackDraft/);

console.log("preventivi-lavorazione-id-orchestration.test.ts OK");
