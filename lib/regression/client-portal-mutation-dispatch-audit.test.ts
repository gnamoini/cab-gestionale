/**
 * Audit statico: mutazioni lavorazioni devono chiamare invalidateAfterLavorazioneMutations
 * o dispatchGestionaleAction via invalidateOperationalTruth / MIC.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname ?? __dirname, "..", "..");

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

const mutationsSrc = read("src/hooks/gestionale/use-lavorazione-mutations.ts");
assert.match(mutationsSrc, /invalidateAfterLavorazioneMutations/, "create/remove/restore/conclude use invalidateAfterLavorazioneMutations");
assert.match(mutationsSrc, /settleLavorazioneQuickUpdate/, "update uses settleLavorazioneQuickUpdate → invalidateOperationalTruth");

const invalidateRelated = read("src/lib/react-query/invalidate-related.ts");
assert.match(invalidateRelated, /dispatchGestionaleAction/, "invalidate-related dispatches gestionale action");
assert.match(invalidateRelated, /invalidateEntity/, "invalidateAfterLavorazioneMutations uses MIC invalidateEntity");

const operationalTruth = read("src/lib/runtime/truth-layer/invalidate-operational-truth.ts");
assert.match(operationalTruth, /dispatchGestionaleAction[\s\S]*lavorazioni/, "lavorazioni domain dispatches gestionale action");

const commitCreate = read("src/lib/react-query/invalidate-related.ts");
assert.match(commitCreate, /commitLavorazioneCreateSuccess/, "create success commits invalidate + scheda dispatch");

console.log("client-portal-mutation-dispatch-audit.test.ts OK");
