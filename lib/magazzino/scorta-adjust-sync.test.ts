import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { commitScortaInputDraft } from "@/lib/magazzino/scorta-input-commit";
import { magazzinoListQueryKey } from "@/lib/magazzino/magazzino-list-cache";
import {
  applyScortaOptimisticDelta,
  applyScortaOptimisticTarget,
  resetScortaSyncQueuesForTest,
} from "@/lib/magazzino/scorta-adjust-sync";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

function seedRow(id: string, quantita: number, meta: MagazzinoRicambioRow["meta"] = {}): MagazzinoRicambioRow {
  const now = new Date().toISOString();
  return {
    id,
    codice: "COD1",
    nome: "Ricambio test",
    marca: "Marca",
    quantita,
    costo: 10,
    prezzo_vendita: 20,
    consumo_medio_mensile: null,
    meta,
    created_at: now,
    updated_at: now,
  };
}

function touchRow(row: { scorta: number; descrizione?: string }) {
  return {
    ...row,
    scorta: row.scorta,
    descrizione: row.descrizione ?? "Ricambio test",
    dataUltimaModifica: new Date().toISOString(),
    autoreUltimaModifica: "Test",
  };
}

resetScortaSyncQueuesForTest();
const qc = new QueryClient();
const id = "11111111-1111-4111-8111-111111111111";
qc.setQueryData(magazzinoListQueryKey(), [seedRow(id, 10)]);

const r1 = applyScortaOptimisticDelta(qc, id, 1, "Test", touchRow as never);
const r2 = applyScortaOptimisticDelta(qc, id, 1, "Test", touchRow as never);
const r3 = applyScortaOptimisticDelta(qc, id, 1, "Test", touchRow as never);
const r4 = applyScortaOptimisticDelta(qc, id, 1, "Test", touchRow as never);

assert.equal(r1.dopo, 11);
assert.equal(r2.dopo, 12);
assert.equal(r3.dopo, 13);
assert.equal(r4.dopo, 14);

const rows = qc.getQueryData<MagazzinoRicambioRow[]>(magazzinoListQueryKey());
assert.equal(rows?.[0]?.quantita, 14);

resetScortaSyncQueuesForTest();
const qcBurst = new QueryClient();
qcBurst.setQueryData(magazzinoListQueryKey(), [seedRow(id, 5)]);
const burst1 = applyScortaOptimisticDelta(qcBurst, id, -1, "Test", touchRow as never, undefined, true);
const burst2 = applyScortaOptimisticDelta(qcBurst, id, -1, "Test", touchRow as never, undefined, false);
assert.equal(burst1.dopo, 4);
assert.equal(burst2.dopo, 3);

resetScortaSyncQueuesForTest();
const qcLegacy = new QueryClient();
const legacyMeta = {
  compatibilitaMezzi: ["Bucher — CityCat 5000", "Bucher — CityCat 5006"],
};
qcLegacy.setQueryData(magazzinoListQueryKey(), [seedRow(id, 2, legacyMeta)]);
applyScortaOptimisticDelta(qcLegacy, id, 1, "Test", touchRow as never);
const legacyRows = qcLegacy.getQueryData<MagazzinoRicambioRow[]>(magazzinoListQueryKey());
assert.equal(legacyRows?.[0]?.quantita, 3);
assert.deepEqual(legacyRows?.[0]?.meta, {
  ...legacyMeta,
  autoreUltimaModifica: "Test",
});
assert.equal((legacyRows?.[0]?.meta as { compatibilitaRefs?: unknown }).compatibilitaRefs, undefined);

resetScortaSyncQueuesForTest();
const qcTarget = new QueryClient();
qcTarget.setQueryData(magazzinoListQueryKey(), [seedRow(id, 7)]);
const targetSet = applyScortaOptimisticTarget(qcTarget, id, 25, "Test", touchRow as never);
assert.equal(targetSet.prima, 7);
assert.equal(targetSet.dopo, 25);
assert.equal(qcTarget.getQueryData<MagazzinoRicambioRow[]>(magazzinoListQueryKey())?.[0]?.quantita, 25);

const targetNoop = applyScortaOptimisticTarget(qcTarget, id, 25, "Test", touchRow as never);
assert.equal(targetNoop.prima, 25);
assert.equal(targetNoop.dopo, 25);
assert.equal(targetNoop.found, true);

resetScortaSyncQueuesForTest();
const qcBurstTarget = new QueryClient();
qcBurstTarget.setQueryData(magazzinoListQueryKey(), [seedRow(id, 10)]);
applyScortaOptimisticDelta(qcBurstTarget, id, 2, "Test", touchRow as never);
applyScortaOptimisticTarget(qcBurstTarget, id, 5, "Test", touchRow as never);
assert.equal(
  qcBurstTarget.getQueryData<MagazzinoRicambioRow[]>(magazzinoListQueryKey())?.[0]?.quantita,
  5,
);

assert.equal(commitScortaInputDraft("25", 10), 25);
assert.equal(commitScortaInputDraft("", 10), 10);
assert.equal(commitScortaInputDraft("abc", 10), 10);
assert.equal(commitScortaInputDraft("-3", 10), 0);

resetScortaSyncQueuesForTest();
console.log("scorta-adjust-sync.test.ts OK");
