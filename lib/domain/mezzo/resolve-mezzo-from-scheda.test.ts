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
  noteIntervento: "",
};

const byIdent = resolveMezzoFromScheda({
  scheda: fields,
  existingMezzi: catalog,
  preferredMezzoId: "m-linked",
});
assert.equal(byIdent.matchKind, "ident");
assert.equal(byIdent.mezzoId, "m-by-plate");

const byPreferred = resolveMezzoFromScheda({
  scheda: { ...fields, targa: "NEW" },
  existingMezzi: catalog,
  preferredMezzoId: "m-linked",
});
assert.equal(byPreferred.matchKind, "preferred");
assert.equal(byPreferred.mezzoId, "m-linked");

console.log("resolve-mezzo-from-scheda.test.ts: ok");
