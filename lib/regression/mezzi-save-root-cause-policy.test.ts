import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// Root cause (static): RQ v5 awaits onSettled before success → isPending until invalidate settles.
const mezzoMutations = read("src/hooks/gestionale/use-mezzo-mutations.ts");
assert.match(mezzoMutations, /refetchType:\s*"none"/);
assert.match(mezzoMutations, /invalidateAfterMezzoMutations/);

const mic = read("lib/cache/minimal-invalidation-contract.ts");
assert.match(mic, /refetchType\?:\s*"active"\s*\|\s*"all"\s*\|\s*"none"/);

const editModal = read("components/gestionale/mezzi/mezzi-edit-modal.tsx");
assert.match(editModal, /loading=\{saving \|\| updateMut\.isPending\}/);
assert.match(editModal, /setSaving\(true\)/);
assert.doesNotMatch(editModal, /invalidateAfterMezzoAssociationChange/);

const mezziView = read("components/gestionale/mezzi/mezzi-view.tsx");
assert.match(mezziView, /syncMezziUrl\(\{ clearHub: true \}\)/);
assert.match(mezziView, /action: "update"/);

const mezziService = read("src/services/mezzi.service.ts");
assert.match(mezziService, /mergeMezzoMetaPatch/);

// No orphan diagnostic module after cleanup.
assert.equal(
  fs.existsSync(path.join(ROOT, "lib/observability/mezzi-save-diagnostic.ts")),
  false,
  "remove temporary mezzi-save-diagnostic after investigation",
);

// Promise / swallow audit: persist path must rethrow via onSaveError, not empty catch.
assert.match(editModal, /\.catch\(onSaveError\)/);
assert.doesNotMatch(
  read("lib/mezzi/persist-mezzo-form.ts"),
  /new Promise\(\s*\(\)\s*=>\s*\{\s*\}\)/,
);

// Realtime dedup exists — no infinite UPDATE→invalidate loop without new writes.
const dispatch = read("lib/sync/gestionale-sync-dispatch.ts");
assert.match(dispatch, /shouldSkipDispatch/);
assert.match(dispatch, /GESTIONALE_DISPATCH_DEDUP_MS/);
