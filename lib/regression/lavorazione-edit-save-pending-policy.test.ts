/**
 * Policy: edit scheda ingresso — nessun await refetch active nel path save orchestrato.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const mutations = read("src/hooks/gestionale/use-lavorazione-mutations.ts");
assert.match(mutations, /UseLavorazioneUpdateMutationOptions/);
assert.match(mutations, /deferInvalidation/);
assert.match(mutations, /if \(error \|\| deferInvalidation\) return;/);

const lavView = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");
assert.match(lavView, /updateLavOrchestrated = useLavorazioneUpdateMutation\(\{ deferInvalidation: true \}\)/);
assert.match(lavView, /updateLavOrchestrated\.mutateAsync/);
assert.match(lavView, /acquireLavorazioneEditFlight/);
assert.match(
  lavView.match(/syncIngressoBackendForEdit[\s\S]*?try \{/)?.[0] ?? "",
  /throw new Error\("SAVE_IN_PROGRESS"\)/,
  "syncIngressoBackendForEdit must throw SAVE_IN_PROGRESS when flight blocked",
);
assert.doesNotMatch(
  lavView.match(/syncIngressoBackendForEdit[\s\S]*?\[attiveRows/)?.[0] ?? "",
  /updateLav\.mutateAsync/,
  "syncIngressoBackendForEdit must not use updateLav",
);

const optimistic = read("src/lib/react-query/lavorazioni-optimistic.ts");
assert.match(optimistic, /refetchType:\s*"none"/);
assert.doesNotMatch(optimistic, /refetchQueries/);

const backendSync = read("lib/schede/ingresso-backend-sync.ts");
const patchModule = read("lib/schede/ingresso-lavorazione-patch.ts");
const saga = read("lib/domain/intervento-context/intervento-write-saga.ts");
const schedeModal = read("components/lavorazioni/schede/schede-lavorazione-modal.tsx");

assert.match(patchModule, /buildConsolidatedIngressoLavorazionePatch/);
assert.match(backendSync, /buildConsolidatedIngressoLavorazionePatch/);
assert.match(backendSync, /mergeLavorazionePatches/);
assert.match(backendSync, /invalidateAfterLavorazioneMutations\([\s\S]*refetchType:\s*"none"/);
assert.match(backendSync, /void qc\.invalidateQueries\([\s\S]*refetchType:\s*"active"/);

assert.doesNotMatch(
  saga,
  /await deps\.updateLavorazione/,
  "saga edit must not call updateLavorazione",
);

assert.match(
  backendSync,
  /await deps\.updateLavorazione\(row\.id, mergedPatch\)/,
  "single updateLavorazione in backend-sync",
);
assert.doesNotMatch(
  backendSync,
  /await deps\.updateLavorazione[\s\S]*await deps\.updateLavorazione/,
  "no serial deps.updateLavorazione awaits",
);

assert.doesNotMatch(
  backendSync,
  /await qc\.invalidateQueries\([^)]*refetchType:\s*"active"/,
  "must not await active refetch in invalidateAfterIngressoEditSave",
);

assert.match(schedeModal, /Promise\.resolve\(onInvalidateAfterIngressoSave/);
assert.match(schedeModal, /reportInvalidateFailure/);
assert.doesNotMatch(
  schedeModal.match(/commitIngressoEdit[\s\S]*?onInvalidateAfterIngressoSave/)?.[0] ?? "",
  /await onInvalidateAfterIngressoSave/,
  "commitIngressoEdit must not await invalidation",
);

const pipeline = read("lib/schede/scheda-ingresso-save-pipeline.ts");
assert.match(pipeline, /beginIngressoSaveGeneration/);

const generation = read("lib/schede/ingresso-save-generation.ts");
assert.match(generation, /assertIngressoSaveGenerationCurrent/);
const pipelineLog = read("lib/schede/scheda-ingresso-save-pipeline-log.ts");
assert.match(pipelineLog, /SAVE_START/);
assert.match(pipelineLog, /SAVE_DONE/);
assert.match(pipelineLog, /SAVE_DUPLICATE_BLOCKED/);
assert.match(pipelineLog, /correlationId/);
assert.match(pipelineLog, /reportInvalidateFailure/);

console.log("lavorazione-edit-save-pending-policy.test.ts: ok");
