import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      out.push(...listTsFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const pipelineSsot = read("lib/schede/scheda-ingresso-save-pipeline.ts");
assert.match(pipelineSsot, /runIngressoSavePipeline/);
assert.match(pipelineSsot, /finally/);
assert.match(pipelineSsot, /lock\.release\(\)/);
assert.match(pipelineSsot, /onPendingChange\?\.\(false\)/);

assert.match(pipelineSsot, /recordExplicitSaveAttempt/);
assert.match(pipelineSsot, /clearExplicitSaveAttempts/);

const loopGuard = read("lib/sync/save-operation-loop-guard.ts");
assert.match(loopGuard, /MAX_EXPLICIT_ATTEMPTS = 5/);
assert.doesNotMatch(loopGuard, /invalidateQueries/);

const hook = read("src/hooks/use-scheda-ingresso-save-pipeline.ts");
assert.match(hook, /runIngressoSavePipeline/);

const saveGate = read("src/hooks/use-scheda-ingresso-save-gate.tsx");
assert.match(saveGate, /SAVE_IN_PROGRESS/);
assert.match(saveGate, /pendingDialogRef/);

const mezzoConfirmDialog = read("components/lavorazioni/schede/scheda-save-conflict-dialog.tsx");
assert.match(mezzoConfirmDialog, /cabModalZConfirm/);

const backendSync = read("lib/schede/ingresso-backend-sync.ts");
assert.doesNotMatch(backendSync, /refetchQueries/);
assert.match(backendSync, /invalidateAfterIngressoEditSave/);

const editModal = read("components/gestionale/lavorazioni/scheda-ingresso-form-modal.tsx");
assert.match(editModal, /useSchedaIngressoSavePipeline/);
assert.match(editModal, /commitIngressoEdit/);
assert.doesNotMatch(editModal, /\bonSave:\s*\(/);

const schedeModal = read("components/lavorazioni/schede/schede-lavorazione-modal.tsx");
assert.match(schedeModal, /commitIngressoEdit/);
assert.match(schedeModal, /ingressoSaveRunRef/);
assert.doesNotMatch(schedeModal, /applyIngressoCommitAsync/);
assert.doesNotMatch(schedeModal, /syncIngressoToBackend/);

const lavView = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");
assert.match(lavView, /syncIngressoBackendFromFrozenCatalog/);
assert.match(lavView, /invalidateAfterIngressoEditSave/);
assert.doesNotMatch(lavView, /syncIngressoToBackend/);

const bannedOutsidePipeline = [
  "applyIngressoCommitAsync",
  "syncIngressoToBackend",
];

const allowedExecuteWrite = new Set([
  path.join(ROOT, "lib/schede/ingresso-backend-sync.ts"),
  path.join(ROOT, "lib/domain/intervento-context/write-contract.ts"),
  path.join(ROOT, "lib/domain/intervento-entry.ts"),
  path.join(ROOT, "src/hooks/use-lavorazione-create-submit.ts"),
  path.join(ROOT, "components/document-capture/capture-scheda-compile-step.tsx"),
]);

for (const file of listTsFiles(ROOT)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (rel.startsWith("lib/regression/")) continue;
  if (rel.startsWith("lib/domain/intervento")) continue;
  if (rel === "lib/schede/ingresso-backend-sync.ts") continue;
  if (rel.includes("node_modules")) continue;
  const src = fs.readFileSync(file, "utf8");
  for (const sym of bannedOutsidePipeline) {
    if (src.includes(sym)) {
      assert.fail(`banned symbol ${sym} in ${rel} — use savePipeline.run / commitIngressoEdit`);
    }
  }
  if (src.includes("executeInterventoWriteEntry") && !allowedExecuteWrite.has(file)) {
    assert.fail(`executeInterventoWriteEntry outside allowed call sites: ${rel}`);
  }
}

// useEffect audit: nessun effetto che richiama save/sync/persist su pending/saving nel form edit.
const editEffects = editModal.match(/useEffect\([\s\S]*?\), \[[^\]]*\]\);/g) ?? [];
for (const block of editEffects) {
  assert.doesNotMatch(
    block,
    /(onSave|commitIngresso|persistBundle|syncIngresso|gateSave|runIngressoSave)/,
    `edit modal useEffect must not trigger save: ${block.slice(0, 80)}`,
  );
}

console.log("scheda-ingresso-save-pipeline-audit.test.ts: ok");
