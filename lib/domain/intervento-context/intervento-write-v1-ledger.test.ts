/**
 * v1 createInterventoTransaction + ledger idempotency skip.
 */
import assert from "node:assert/strict";
import { createInterventoTransaction } from "@/lib/domain/intervento-context/write-contract";
import {
  clearInterventoWriteLedger,
  upsertInterventoWriteLedger,
} from "@/lib/domain/intervento-context/intervento-write-ledger";
import type { SchedaIngressoFields } from "@/types/schede";

const fields: SchedaIngressoFields = {
  dataIngresso: "01/06/2026",
  cliente: "Cliente",
  cantiere: "",
  utilizzatore: "",
  tipoAttrezzatura: "",
  marcaAttrezzatura: "Marca",
  modelloAttrezzatura: "Modello",
  matricola: "MAT-1",
  nScuderia: "",
  oreLavoro: "",
  tipoTelaio: "",
  marcaTelaio: "",
  modelloTelaio: "",
  targa: "AA001BB",
  km: "",
  descrizioneAnomalia: "",
  livelloCarburante: "",
  addettoAccettazione: "",
  richiedente: "",
  noteIntervento: "",
};

async function testLedgerSkip(): Promise<void> {
  const key = "v1-idem-test";
  clearInterventoWriteLedger(key);
  upsertInterventoWriteLedger(key, { lavorazioneId: "lav-existing", mezzoId: "m-existing" });

  let upsertCalls = 0;
  let createCalls = 0;
  let persistCalls = 0;

  const res = await createInterventoTransaction({
    fields,
    idempotencyKey: key,
    mezziCatalog: [],
    meta: {
      statoId: "accettazione",
      priorita: "media",
      dataIngressoIso: "2026-06-01T12:00:00.000Z",
      note: null,
      createdBy: "tester",
    },
    deps: {
      upsertMezzo: async () => {
        upsertCalls += 1;
        return { mezzoId: "m-new", created: false, updated: false };
      },
      createLavorazione: async () => {
        createCalls += 1;
        return { id: "lav-new" } as never;
      },
      persistScheda: async () => {
        persistCalls += 1;
        return { ok: true as const };
      },
    },
  });

  assert.equal(upsertCalls, 0);
  assert.equal(createCalls, 0);
  assert.equal(persistCalls, 1);
  assert.equal(res.ok && res.lavorazioneId, "lav-existing");
  clearInterventoWriteLedger(key);
}

async function testCreatePropagatesTarget(): Promise<void> {
  const key = "v1-target-propagate";
  clearInterventoWriteLedger(key);

  let capturedTarget: string | undefined;
  let capturedAttId: string | null | undefined;

  const res = await createInterventoTransaction({
    fields,
    idempotencyKey: key,
    mezziCatalog: [],
    meta: {
      statoId: "accettazione",
      priorita: "media",
      dataIngressoIso: "2026-06-01T12:00:00.000Z",
      note: null,
      createdBy: "tester",
    },
    deps: {
      upsertMezzo: async () => ({
        mezzoId: "m-new",
        created: true,
        updated: false,
        targetType: "attrezzatura",
        attrezzaturaId: "b2c3d4e5-f6a7-4890-bcde-f12345678901",
      }),
      createLavorazione: async (input) => {
        capturedTarget = input.target_type;
        capturedAttId = input.attrezzatura_id;
        return { id: "lav-new" } as never;
      },
      persistScheda: async () => ({ ok: true as const }),
    },
  });

  assert.equal(res.ok && res.lavorazioneId, "lav-new");
  assert.equal(capturedTarget, "attrezzatura");
  assert.equal(capturedAttId, "b2c3d4e5-f6a7-4890-bcde-f12345678901");
  clearInterventoWriteLedger(key);
}

async function run(): Promise<void> {
  await testLedgerSkip();
  await testCreatePropagatesTarget();
}

void run().then(() => {
  console.log("intervento-write-v1-ledger.test.ts OK");
});
