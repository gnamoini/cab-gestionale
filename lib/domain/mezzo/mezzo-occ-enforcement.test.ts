import assert from "node:assert/strict";
import { isMezzoUpdatedAtStale } from "@/lib/domain/mezzo/mezzo-occ";
import { upsertFromSchedaV2 } from "@/lib/domain/mezzo-attrezzatura/upsert-from-scheda-v2";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { MezzoSchedaValidationError } from "@/lib/mezzi/upsert-mezzo-from-scheda";
import type { SchedaIngressoFields } from "@/types/schede";

const baseFields: SchedaIngressoFields = {
  dataIngresso: "04/06/2026",
  cliente: "Acme",
  cantiere: "",
  utilizzatore: "",
  tipoAttrezzatura: "",
  marcaAttrezzatura: "FIAT",
  modelloAttrezzatura: "500",
  matricola: "",
  nScuderia: "",
  oreLavoro: "",
  tipoTelaio: "",
  marcaTelaio: "",
  modelloTelaio: "",
  vin: "",
  targa: "AA111BB",
  km: "",
  descrizioneAnomalia: "",
  livelloCarburante: "",
  addettoAccettazione: "",
  richiedente: "",
  richiedenteTelefono: "",
  targetType: "telaio",
  attrezzaturaId: "",
};

function mezzo(partial: Partial<MezzoGestito> & Pick<MezzoGestito, "id">): MezzoGestito {
  return {
    id: partial.id,
    cliente: partial.cliente ?? "Cliente",
    utilizzatore: partial.utilizzatore ?? "—",
    marca: partial.marca ?? "Marca",
    modello: partial.modello ?? "Modello",
    targa: partial.targa ?? "AA111BB",
    matricola: partial.matricola ?? "—",
    numeroScuderia: partial.numeroScuderia ?? "—",
    tipoAttrezzatura: partial.tipoAttrezzatura ?? "—",
    anno: partial.anno ?? 2024,
    cantiere: partial.cantiere ?? "—",
    tipoTelaio: partial.tipoTelaio ?? "—",
    marcaTelaio: partial.marcaTelaio ?? "—",
    modelloTelaio: partial.modelloTelaio ?? "—",
    oreKm: partial.oreKm ?? 0,
    km: partial.km,
    statoAttuale: partial.statoAttuale ?? "Operativo",
    dataUltimaUscita: partial.dataUltimaUscita ?? "2024-01-01",
    note: partial.note ?? "",
    priorita: partial.priorita ?? "normale",
    ultimaModifica: partial.ultimaModifica,
  };
}

async function run() {
  const t0 = "2026-06-04T10:00:00.000Z";
  const t1 = "2026-06-04T10:00:00.500Z";
  const t2 = "2026-06-04T10:00:02.000Z";

  assert.equal(isMezzoUpdatedAtStale(t0, t1), false, "500ms within tolerance");
  assert.equal(isMezzoUpdatedAtStale(t0, t2), true, "2s beyond tolerance");

  const catalog = [mezzo({ id: "m1", targa: "AA111BB", ultimaModifica: t2 })];
  let updated = false;

  try {
    await upsertFromSchedaV2(
      {
        fields: { ...baseFields, cliente: "New Client" },
        mezziCatalog: catalog,
        updatePlan: {
          updateAnagrafica: true,
          fieldsToUpdate: ["cliente"],
          updateMetering: false,
          meteringFields: [],
          forceDespiteStale: false,
          mezzoOCC: { updatedAtAtLinkTime: t0 },
        },
      },
      {
        createMezzo: async () => {
          throw new Error("no create");
        },
        updateMezzo: async () => {
          updated = true;
          return { id: "m1" } as never;
        },
        createAttrezzatura: async () => ({ id: "a1" }) as never,
        updateAttrezzatura: async () => ({ id: "a1" }) as never,
        findAttrezzaturaByMatricola: async () => null,
      },
    );
    assert.fail("expected MEZZO_STALE_CONFLICT");
  } catch (err) {
    assert.ok(err instanceof MezzoSchedaValidationError);
    assert.equal(err.message, "MEZZO_STALE_CONFLICT");
  }
  assert.equal(updated, false, "stale reject must not patch");

  updated = false;
  await upsertFromSchedaV2(
    {
      fields: { ...baseFields, cliente: "New Client" },
      mezziCatalog: catalog,
      updatePlan: {
        updateAnagrafica: true,
        fieldsToUpdate: ["cliente"],
        updateMetering: false,
        meteringFields: [],
        forceDespiteStale: true,
        mezzoOCC: { updatedAtAtLinkTime: t0 },
      },
    },
    {
      createMezzo: async () => {
        throw new Error("no create");
      },
      updateMezzo: async () => {
        updated = true;
        return { id: "m1" } as never;
      },
      createAttrezzatura: async () => ({ id: "a1" }) as never,
      updateAttrezzatura: async () => ({ id: "a1" }) as never,
      findAttrezzaturaByMatricola: async () => null,
    },
  );
  assert.equal(updated, true, "forceDespiteStale allows patch");

  console.log("mezzo-occ-enforcement.test.ts OK");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
