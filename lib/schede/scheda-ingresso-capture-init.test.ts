import assert from "node:assert/strict";
import { initSchedaIngressoFieldsForCreate } from "@/lib/schede/scheda-ingresso-reuse";
import type { SchedaIngressoFields } from "@/types/schede";

function emptyFields(dataIngresso = "21/07/2026"): SchedaIngressoFields {
  return {
    targetType: "attrezzatura",
    attrezzaturaId: null,
    dataIngresso,
    cliente: "",
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
    targa: "",
    km: "",
    descrizioneAnomalia: "",
    livelloCarburante: "",
    addettoAccettazione: "",
    richiedente: "",
    richiedenteTelefono: "",
    noteIntervento: "",
  };
}

const scanned = initSchedaIngressoFieldsForCreate(emptyFields("21/07/2026"), {
  ...emptyFields(""),
  dataIngresso: "18/06/2024",
  cliente: "Cliente Scan",
});
assert.equal(scanned.dataIngresso, "18/06/2024");
assert.equal(scanned.cliente, "Cliente Scan");

const noScanDate = initSchedaIngressoFieldsForCreate(emptyFields("21/07/2026"), {
  ...emptyFields(""),
  dataIngresso: "",
  targa: "AA111BB",
});
assert.equal(noScanDate.dataIngresso, "");
assert.equal(noScanDate.targa, "AA111BB");

const manualCreate = initSchedaIngressoFieldsForCreate(emptyFields("21/07/2026"), null);
assert.equal(manualCreate.dataIngresso, "21/07/2026");

console.log("scheda-ingresso-capture-init.test.ts: ok");
