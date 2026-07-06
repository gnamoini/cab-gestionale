import assert from "node:assert/strict";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { upsertMezzoFromSchedaIngresso } from "@/lib/mezzi/upsert-mezzo-from-scheda";
import type { SchedaIngressoFields } from "@/types/schede";

function mezzo(partial: Partial<MezzoGestito> & Pick<MezzoGestito, "id">): MezzoGestito {
  return {
    id: partial.id,
    cliente: partial.cliente ?? "Cliente",
    utilizzatore: partial.utilizzatore ?? "—",
    marca: partial.marca ?? "Marca",
    modello: partial.modello ?? "Modello",
    targa: partial.targa ?? "—",
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
  };
}

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
  addettoAccettazione: "Angelo",
  richiedente: "",
  noteIntervento: "",
};

async function run() {
  const catalog = [
    mezzo({ id: "m-linked", targa: "ZZ999ZZ", marca: "Bobcat", modello: "E35" }),
    mezzo({ id: "m-by-plate", targa: "AA111BB", marca: "FIAT", modello: "500" }),
  ];
  let updatedId = "";
  const result = await upsertMezzoFromSchedaIngresso({
    fields: baseFields,
    mezziCatalog: catalog,
    preferredMezzoId: "m-linked",
    create: async () => {
      throw new Error("should not create");
    },
    update: async (id) => {
      updatedId = id;
      return { id } as never;
    },
  });
  assert.equal(result.mezzoId, "m-by-plate", "ident match must win over preferredMezzoId");
  assert.equal(updatedId, "m-by-plate");
  console.log("upsert-mezzo-from-scheda.test.ts OK");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
