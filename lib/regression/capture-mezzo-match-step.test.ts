import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const matchStep = fs.readFileSync(
  path.join(ROOT, "components/document-capture/capture-mezzo-match-step.tsx"),
  "utf8",
);

assert.match(matchStep, /ManualAssignState/);
assert.match(matchStep, /Conferma assegnazione/);
assert.match(matchStep, /Usa questa/);
assert.match(matchStep, /Scegli una lavorazione diversa/);
assert.match(matchStep, /onSelect\(lav\.id\)/);
assert.match(matchStep, /onConfirmAssign/);
assert.doesNotMatch(matchStep, /onClick=\{\(\) => onAssign\(lav\.id\)\}/);
assert.match(matchStep, /SEARCH_DEBOUNCE_MS/);
assert.match(matchStep, /role="listbox"/);
assert.match(matchStep, /useSelectorListboxKeyboard/);
assert.match(matchStep, /✓ Collegata/);
assert.match(matchStep, /Collegamento…/);

console.log("capture-mezzo-match-step.test.ts OK");
