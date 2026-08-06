import assert from "node:assert/strict";
import { resolveMezzoFromScheda } from "@/lib/domain/mezzo/resolve-mezzo-from-scheda";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

const catalog: MezzoGestito[] = [
  {
    id: "m-by-plate",
    cliente: "A",
    utilizzatore: "—",
    marca: "X",
    modello: "Y",
    targa: "AA111BB",
    matricola: "Non assegnata",
    tipoAttrezzatura: "—",
    anno: 2020,
    oreKm: 0,
    statoAttuale: "Operativo",
    dataUltimaUscita: "—",
    note: "",
    priorita: "normale",
  },
  {
    id: "m-linked",
    cliente: "B",
    utilizzatore: "—",
    marca: "Z",
    modello: "W",
    targa: "ZZ999ZZ",
    matricola: "Non assegnata",
    tipoAttrezzatura: "—",
    anno: 2021,
    oreKm: 0,
    statoAttuale: "Operativo",
    dataUltimaUscita: "—",
    note: "",
    priorita: "normale",
  },
];

const fields: SchedaIngressoFields = {
  dataIngresso: "01/01/2026",
  cliente: "C",
  cantiere: "",
  utilizzatore: "",
  tipoAttrezzatura: "",
  marcaAttrezzatura: "M",
  modelloAttrezzatura: "",
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
};

const byPreferredOverIdent = resolveMezzoFromScheda({
  scheda: fields,
  existingMezzi: catalog,
  preferredMezzoId: "m-linked",
});
assert.equal(byPreferredOverIdent.matchKind, "explicit");
assert.equal(byPreferredOverIdent.mezzoId, "m-linked");

const byPreferred = resolveMezzoFromScheda({
  scheda: { ...fields, targa: "NEW" },
  existingMezzi: catalog,
  preferredMezzoId: "m-linked",
});
assert.equal(byPreferred.matchKind, "explicit");
assert.equal(byPreferred.mezzoId, "m-linked");

const byVin = resolveMezzoFromScheda({
  scheda: {
    ...fields,
    targa: "",
    vin: "WVWZZZ1JZ3W386752",
  },
  existingMezzi: [
    ...catalog,
    {
      id: "m-vin",
      cliente: "V",
      utilizzatore: "—",
      marca: "X",
      modello: "Y",
      targa: "—",
      matricola: "Non assegnata",
      tipoAttrezzatura: "—",
      anno: 2020,
      vin: "WVWZZZ1JZ3W386752",
      oreKm: 0,
      statoAttuale: "Operativo",
      dataUltimaUscita: "—",
      note: "",
      priorita: "normale",
    },
  ],
});
assert.equal(byVin.matchKind, "needs_confirm");
assert.equal(byVin.mezzoId, null);

console.log("resolve-mezzo-from-scheda.test.ts: ok");
