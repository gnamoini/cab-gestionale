import assert from "node:assert/strict";
import { createInterventoTransaction } from "@/lib/domain/intervento-context/write-contract";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

const fields: SchedaIngressoFields = {
  dataIngresso: "01/01/2026",
  cliente: "Acme",
  cantiere: "",
  utilizzatore: "",
  tipoAttrezzatura: "",
  marcaAttrezzatura: "",
  modelloAttrezzatura: "",
  matricola: "",
  nScuderia: "",
  oreLavoro: "50",
  tipoTelaio: "",
  marcaTelaio: "",
  modelloTelaio: "",
  vin: "",
  targa: "ZZ999ZZ",
  km: "1000",
  descrizioneAnomalia: "",
  livelloCarburante: "",
  addettoAccettazione: "",
  richiedente: "",
  richiedenteTelefono: "",
  targetType: "telaio",
  attrezzaturaId: "",
};

const catalog: MezzoGestito[] = [
  {
    id: "m-existing",
    cliente: "Acme",
    utilizzatore: "—",
    marca: "M",
    modello: "M",
    targa: "ZZ999ZZ",
    matricola: "—",
    numeroScuderia: "—",
    tipoAttrezzatura: "—",
    anno: 2024,
    cantiere: "—",
    tipoTelaio: "—",
    marcaTelaio: "—",
    modelloTelaio: "—",
    oreKm: 0,
    km: 500,
    statoAttuale: "Operativo",
    dataUltimaUscita: "2024-01-01",
    note: "",
    priorita: "normale",
  },
];

async function run() {
  const upsertCalls: Array<{ updatePlan?: { updateMetering?: boolean }; lavorazioneId?: string | null }> = [];

  const result = await createInterventoTransaction({
    fields,
    meta: {
      statoId: "accettazione",
      priorita: "normale",
      dataIngressoIso: "2026-01-01T12:00:00.000Z",
      note: null,
      createdBy: "user-1",
      writeContext: {
        source: "manual",
        mezzoUpdatePlan: {
          updateAnagrafica: false,
          fieldsToUpdate: [],
          updateMetering: true,
          meteringFields: ["km", "oreLavoro"],
          forceDespiteStale: false,
        },
      },
    },
    mezziCatalog: catalog,
    deps: {
      upsertMezzo: async (input) => {
        upsertCalls.push({ updatePlan: input.updatePlan, lavorazioneId: input.lavorazioneId });
        return { mezzoId: "m-existing", created: false, targetType: "telaio" };
      },
      createLavorazione: async () => ({ id: "lav-new" }) as never,
      persistScheda: async () => ({ ok: true }),
    },
  });

  assert.equal(result.ok, true);
  assert.equal(upsertCalls.length, 2, "anagrafica pre-lav + metering post-lav");
  assert.equal(upsertCalls[0]?.updatePlan?.updateMetering, false);
  assert.equal(upsertCalls[1]?.updatePlan?.updateMetering, true);
  assert.equal(upsertCalls[1]?.lavorazioneId, "lav-new");

  const retry = await createInterventoTransaction({
    fields,
    existingLavorazioneId: "lav-new",
    meta: {
      statoId: "accettazione",
      priorita: "normale",
      dataIngressoIso: "2026-01-01T12:00:00.000Z",
      note: null,
      createdBy: "user-1",
      writeContext: {
        source: "manual",
        mezzoUpdatePlan: {
          updateAnagrafica: false,
          fieldsToUpdate: [],
          updateMetering: true,
          meteringFields: ["km"],
          forceDespiteStale: false,
        },
      },
    },
    mezziCatalog: catalog,
    deps: {
      upsertMezzo: async (input) => {
        upsertCalls.push({ updatePlan: input.updatePlan, lavorazioneId: input.lavorazioneId });
        return { mezzoId: "m-existing", created: false, targetType: "telaio" };
      },
      createLavorazione: async () => ({ id: "lav-new" }) as never,
      persistScheda: async () => ({ ok: true }),
    },
  });

  assert.equal(retry.ok, true);
  assert.ok(upsertCalls.some((c) => c.lavorazioneId === "lav-new" && c.updatePlan?.updateMetering));

  console.log("create-metering-order.test.ts OK");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
