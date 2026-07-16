import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

assert.ok(fs.existsSync(path.join(ROOT, "docs/minimal-invalidation-contract.md")), "minimal-invalidation-contract doc missing");

const micCore = read("lib/cache/minimal-invalidation-contract.ts");
assert.match(micCore, /invalidateEntity/);
assert.match(micCore, /invalidateOperationalTruth/);

const registry = read("lib/cache/mic-registry.ts");
for (const entity of ["lavorazione", "documento", "mezzo", "report", "settings"]) {
  assert.match(registry, new RegExp(`${entity}:`));
}

const micServer = read("lib/cache/mic-server-invalidate.server.ts");
assert.match(micServer, /invalidatePdfArtifactScope/);
assert.doesNotMatch(micServer, /select\s*\(\s*["']\*["']\s*\)/);

const apiRoute = read("app/api/cache/invalidate-entity/route.ts");
assert.match(apiRoute, /runMicServerInvalidations/);
assert.match(apiRoute, /verifyServerPageWrite/);

const invalidateOperational = read("src/lib/runtime/truth-layer/invalidate-operational-truth.ts");
assert.match(invalidateOperational, /case "lavorazioni":[\s\S]*log_modifiche/);

const lavMutations = read("src/hooks/gestionale/use-lavorazione-mutations.ts");
assert.match(lavMutations, /invalidateAfterLavorazioneMutations/);

const mezzoMutations = read("src/hooks/gestionale/use-mezzo-mutations.ts");
assert.match(mezzoMutations, /invalidateAfterMezzoMutations/);

const documentiView = read("components/gestionale/documenti/documenti-view.tsx");
assert.match(documentiView, /invalidateEntity/);

const versionRegistry = read("lib/cache/entity-version-registry.ts");
assert.match(versionRegistry, /resolveEntityCacheVersion/);

const previewUrl = read("lib/documents/document-preview-url.ts");
assert.match(previewUrl, /resolveEntityCacheVersion/);

const createModal = read("components/gestionale/lavorazioni/lavorazione-create-modal.tsx");
assert.match(createModal, /useLavorazioneCreateMutation/);
assert.match(createModal, /commitLavorazioneCreateSuccess/);
assert.doesNotMatch(createModal, /dispatchGestionaleLocalMutation\(qc,\s*\[["']lavorazioni["']\]/);

const lavView = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");
assert.match(lavView, /await persistSchedeAndSync/);

const statoMove = read("src/hooks/gestionale/use-lavorazione-stato-move-mutation.ts");
assert.match(statoMove, /updateLav:/);

console.log("minimal-invalidation-contract-policy: OK");
