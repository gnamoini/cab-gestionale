import assert from "node:assert/strict";
import { anagraficaHistoryOrigineFromWriteContext } from "@/lib/domain/intervento-context/intervento-write-context";
import { upsertMezzoFromSchedaIngresso } from "@/lib/mezzi/upsert-mezzo-from-scheda";
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
  oreLavoro: "",
  tipoTelaio: "",
  marcaTelaio: "",
  modelloTelaio: "",
  vin: "",
  targa: "ABC999",
  km: "",
  descrizioneAnomalia: "",
  livelloCarburante: "",
  addettoAccettazione: "",
  richiedente: "",
  richiedenteTelefono: "",
  targetType: "telaio",
  attrezzaturaId: "",
};

function mezzo(id: string, targa: string): MezzoGestito {
  return {
    id,
    cliente: "Acme",
    utilizzatore: "—",
    marca: "M",
    modello: "M",
    targa,
    matricola: "—",
    numeroScuderia: "—",
    tipoAttrezzatura: "—",
    anno: 2024,
    cantiere: "—",
    tipoTelaio: "—",
    marcaTelaio: "—",
    modelloTelaio: "—",
    oreKm: 0,
    statoAttuale: "Operativo",
    dataUltimaUscita: "2024-01-01",
    note: "",
    priorita: "normale",
  };
}

async function run() {
  assert.equal(anagraficaHistoryOrigineFromWriteContext("import_ai", "scheda"), "import_ai");

  const catalog = [mezzo("m-old", "ABC123")];
  let historyOrigine = "";
  let patchedTarga = "";

  await upsertMezzoFromSchedaIngresso({
    fields,
    mezziCatalog: catalog,
    preferredMezzoId: "m-old",
    lavorazioneId: "lav-ai",
    writeContext: {
      source: "import_ai",
      mezzoUpdatePlan: {
        updateAnagrafica: true,
        fieldsToUpdate: ["targa"],
        updateMetering: false,
        meteringFields: [],
        forceDespiteStale: true,
      },
    },
    create: async () => {
      throw new Error("no create");
    },
    update: async (id, data) => {
      patchedTarga = String(data.targa ?? "");
      return { id } as never;
    },
    recordHistory: async (input) => {
      historyOrigine = input.origine;
      assert.equal(input.oldValues.targa, "ABC123");
      assert.equal(input.newValues.targa, "ABC999");
    },
  });

  assert.equal(patchedTarga, "ABC999");
  assert.equal(historyOrigine, "import_ai");

  console.log("capture-ai-anagrafica-update.test.ts OK");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
