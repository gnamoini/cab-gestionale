import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// Root cause (static): RQ v5 awaits onSettled before success → isPending until invalidate settles.
const mezzoMutations = read("src/hooks/gestionale/use-mezzo-mutations.ts");
const settleCache = read("lib/sync/settle-mezzo-mutation-cache.ts");

assert.match(mezzoMutations, /settleMezzoMutationCache/);
assert.match(settleCache, /refetchType:\s*"none"/);
assert.match(settleCache, /void qc\.invalidateQueries/);

for (const op of ["create", "update", "setTagliandi"] as const) {
  const block = mezzoMutations.match(
    new RegExp(`operation:\\s*"${op}"[\\s\\S]*?onSettled[\\s\\S]*?settleMezzoMutationCache`),
  )?.[0];
  assert.ok(block, `expected settleMezzoMutationCache in onSettled for ${op}`);
  assert.doesNotMatch(
    block ?? "",
    /invalidateAfterMezzoMutations\([^)]*\)(?![\s\S]*refetchType)/,
    `${op} must not call invalidateAfterMezzoMutations without settle helper`,
  );
}

assert.doesNotMatch(
  mezzoMutations,
  /invalidateAfterMezzoMutations/,
  "use-mezzo-mutations must delegate invalidation to settleMezzoMutationCache",
);

assert.doesNotMatch(
  settleCache,
  /await qc\.invalidateQueries\([^)]*refetchType:\s*"active"/,
  "settle path must not await active refetch",
);

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

assert.equal(
  fs.existsSync(path.join(ROOT, "lib/observability/mezzo-mutation-save-trace.ts")),
  true,
  "mezzo save trace module for DEBUG_INGRESSO_SAVE",
);

assert.match(editModal, /\.catch\(onSaveError\)/);
assert.doesNotMatch(
  read("lib/mezzi/persist-mezzo-form.ts"),
  /new Promise\(\s*\(\)\s*=>\s*\{\s*\}\)/,
);

const dispatch = read("lib/sync/gestionale-sync-dispatch.ts");
assert.match(dispatch, /shouldSkipDispatch/);
assert.match(dispatch, /GESTIONALE_DISPATCH_DEDUP_MS/);

console.log("mezzi-save-root-cause-policy.test.ts: ok");
