/**
 * Write saga: ledger skip stage + edit mezzo_id FK sync.
 */
import assert from "node:assert/strict";
import { runInterventoWriteSaga } from "@/lib/domain/intervento-context/intervento-write-saga";
import {
  clearInterventoWriteLedger,
  upsertInterventoWriteLedger,
} from "@/lib/domain/intervento-context/intervento-write-ledger";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { SchedaIngressoFields } from "@/types/schede";

const fields: SchedaIngressoFields = {
  dataIngresso: "01/06/2026",
  cliente: "Cliente Test",
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

const row = {
  id: "lav-edit-1",
  mezzo_id: "mezzo-old",
  note: "nota",
  mezzo: null,
} as LavorazioneListRow;

async function run(): Promise<void> {
  const key = "test-idem-key";
  clearInterventoWriteLedger(key);
  upsertInterventoWriteLedger(key, { lavorazioneId: "lav-partial", mezzoId: "m1" });

  let upsertCalls = 0;
  let createCalls = 0;

  const partial = await runInterventoWriteSaga(
    {
      mode: "create",
      idempotencyKey: key,
      fields,
      mezziCatalog: [],
      meta: {
        statoId: "accettazione",
        priorita: "media",
        dataIngressoIso: "2026-06-01T12:00:00.000Z",
        note: null,
        createdBy: "tester",
      },
    },
    {
      upsertMezzo: async () => {
        upsertCalls += 1;
        return { mezzoId: "m1", created: false, updated: false };
      },
      createLavorazione: async () => {
        createCalls += 1;
        return { id: "lav-new" } as never;
      },
      persistScheda: async () => ({ ok: true as const }),
    },
  );

  assert.equal(upsertCalls, 0, "ledger skip upsert on partial retry");
  assert.equal(createCalls, 0, "ledger skip create on partial retry");
  assert.equal(partial.ok && partial.lavorazioneId, "lav-partial");

  let patchedMezzoId: string | undefined;
  const edit = await runInterventoWriteSaga(
    {
      mode: "edit",
      idempotencyKey: "edit-key",
      fields,
      mezziCatalog: [],
      meta: { row },
    },
    {
      upsertMezzo: async () => {
        upsertCalls += 1;
        return {
          mezzoId: "mezzo-new",
          created: false,
          updated: true,
          targetType: "attrezzatura" as const,
          attrezzaturaId: "b2c3d4e5-f6a7-4890-bcde-f12345678901",
        };
      },
      updateLavorazione: async (_id, patch) => {
        patchedMezzoId = patch.mezzo_id;
      },
    },
  );

  assert.equal(edit.ok, true);
  assert.equal(patchedMezzoId, "mezzo-new", "v2 sync aggiorna FK se resolved diverso");
}

void run().then(() => {
  console.log("intervento-write-saga.test.ts OK");
});
