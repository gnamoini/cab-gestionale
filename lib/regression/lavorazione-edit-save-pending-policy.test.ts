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
assert.match(patchModule, /buildConsolidatedIngressoLavorazionePatch/);
assert.match(backendSync, /buildConsolidatedIngressoLavorazionePatch/);
assert.match(backendSync, /invalidateAfterLavorazioneMutations\([\s\S]*refetchType:\s*"none"/);
assert.match(backendSync, /void qc\.invalidateQueries\([\s\S]*refetchType:\s*"active"/);

// Una sola updateLavorazione consolidata dopo il blocco executeInterventoWriteEntry
assert.match(
  backendSync,
  /if \(patchKeys\.length > 0\)[\s\S]*await deps\.updateLavorazione\(row\.id, lavPatch\)/,
);
assert.doesNotMatch(
  backendSync,
  /await deps\.updateLavorazione[\s\S]*await deps\.updateLavorazione/,
  "no serial deps.updateLavorazione awaits after consolidation",
);

assert.doesNotMatch(
  backendSync,
  /await qc\.invalidateQueries\([^)]*refetchType:\s*"active"/,
  "must not await active refetch in invalidateAfterIngressoEditSave",
);

const pipelineLog = read("lib/schede/scheda-ingresso-save-pipeline-log.ts");
assert.match(pipelineLog, /SAVE_START/);
assert.match(pipelineLog, /SAVE_REQUEST/);
assert.match(pipelineLog, /SAVE_RESPONSE/);
assert.match(pipelineLog, /durationMs/);

console.log("lavorazione-edit-save-pending-policy.test.ts: ok");
