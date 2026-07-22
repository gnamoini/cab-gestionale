import assert from "node:assert/strict";
import { resolveMezzoUpdatePlanFromContext } from "@/lib/domain/intervento-context/intervento-write-context";
import { MEZZO_UPDATE_SCHEDA_ONLY } from "@/lib/domain/mezzo/mezzo-update-from-scheda-plan";
import { upsertFromSchedaV2 } from "@/lib/domain/mezzo-attrezzatura/upsert-from-scheda-v2";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

const fields: SchedaIngressoFields = {
  dataIngresso: "01/01/2026",
  cliente: "Acme",
  cantiere: "",
  utilizzatore: "",
  tipoAttrezzatura: "",
  marcaAttrezzatura: "X",
  modelloAttrezzatura: "Y",
  matricola: "",
  nScuderia: "",
  oreLavoro: "100",
  tipoTelaio: "",
  marcaTelaio: "",
  modelloTelaio: "",
  vin: "",
  targa: "AA111BB",
  km: "50000",
  descrizioneAnomalia: "",
  livelloCarburante: "",
  addettoAccettazione: "",
  richiedente: "",
  richiedenteTelefono: "",
  noteIntervento: "",
  targetType: "telaio",
  attrezzaturaId: "",
};

const catalog: MezzoGestito[] = [
  {
    id: "m1",
    cliente: "Acme",
    utilizzatore: "—",
    marca: "Old",
    modello: "Old",
    targa: "AA111BB",
    matricola: "—",
    numeroScuderia: "—",
    tipoAttrezzatura: "—",
    anno: 2024,
    cantiere: "—",
    tipoTelaio: "—",
    marcaTelaio: "—",
    modelloTelaio: "—",
    oreKm: 50,
    km: 40000,
    statoAttuale: "Operativo",
    dataUltimaUscita: "2024-01-01",
    note: "",
    priorita: "normale",
  },
];

async function run() {
  const defaultImportAiPlan = resolveMezzoUpdatePlanFromContext({ source: "import_ai" });
  assert.deepEqual(defaultImportAiPlan, MEZZO_UPDATE_SCHEDA_ONLY, "import_ai senza plan → scheda only");

  let updateCalls = 0;
  await upsertFromSchedaV2(
    {
      fields: { ...fields, marcaAttrezzatura: "NewBrand" },
      mezziCatalog: catalog,
      updatePlan: MEZZO_UPDATE_SCHEDA_ONLY,
    },
    {
      createMezzo: async () => {
        throw new Error("no create");
      },
      updateMezzo: async () => {
        updateCalls += 1;
        return { id: "m1" } as never;
      },
      createAttrezzatura: async () => ({ id: "a1" }) as never,
      updateAttrezzatura: async () => ({ id: "a1" }) as never,
      findAttrezzaturaByMatricola: async () => null,
    },
  );
  assert.equal(updateCalls, 0, "MEZZO_UPDATE_SCHEDA_ONLY non deve patchare mezzo esistente");

  console.log("capture-apply-no-mezzo-patch.test.ts OK");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
