import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const editorModal = fs.readFileSync(
  path.join(ROOT, "components/preventivi/preventivi-editor-modal.tsx"),
  "utf8",
);
const syncAdapter = fs.readFileSync(path.join(ROOT, "lib/preventivi/preventivi-sync-adapter.ts"), "utf8");
const anagraficaFields = fs.readFileSync(
  path.join(ROOT, "components/gestionale/schede/scheda-ingresso-anagrafica-fields.tsx"),
  "utf8",
);

assert.match(editorModal, /surface="preventivo"/);
assert.match(editorModal, /persistPreventivoRecord/);
assert.doesNotMatch(editorModal, /useSchedaIngressoSavePipeline/);
assert.doesNotMatch(editorModal, /useSchedaIngressoMezzoPrompt/);
assert.doesNotMatch(editorModal, /upsertMezzoFromScheda/);
assert.doesNotMatch(editorModal, /persistBundle/);
assert.doesNotMatch(editorModal, /schedeStore/);
assert.doesNotMatch(editorModal, /lavorazioni-schede-storage/);

assert.match(syncAdapter, /lavorazione collegata vince su re-match ident/);
assert.doesNotMatch(syncAdapter, /upsertMezzoFromScheda/);

assert.match(anagraficaFields, /surface\?: "lavorazione" \| "preventivo"/);
assert.match(anagraficaFields, /isPreventivoSurface/);

console.log("preventivo-editor-isolation.test.ts OK");
