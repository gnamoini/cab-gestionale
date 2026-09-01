import assert from "node:assert/strict";
import {
  attrezzaturaOverwriteFieldsFromPlan,
  schedaFieldsToAttrezzaturaPatch,
} from "@/lib/domain/mezzo/apply-mezzo-patch-from-scheda-fields";
import type { SchedaIngressoFields } from "@/types/schede";

function baseFields(): SchedaIngressoFields {
  return {
    dataIngresso: "01/01/2026",
    cliente: "Cliente",
    cantiere: "",
    utilizzatore: "",
    tipoAttrezzatura: "Gru",
    marcaAttrezzatura: "OLD-MARCA",
    modelloAttrezzatura: "OLD-MOD",
    matricola: "MAT1",
    nScuderia: "",
    oreLavoro: "100",
    tipoTelaio: "",
    marcaTelaio: "",
    modelloTelaio: "",
    vin: "",
    targa: "AA000AA",
    km: "",
    descrizioneAnomalia: "",
    livelloCarburante: "",
    addettoAccettazione: "",
    richiedente: "",
    richiedenteTelefono: "",
  };
}

function run() {
  const overwrite = attrezzaturaOverwriteFieldsFromPlan([
    "marcaAttrezzatura",
    "modelloAttrezzatura",
    "targa",
  ]);
  assert.deepEqual([...overwrite].sort(), ["marca", "modello"]);

  const fields = baseFields();
  fields.marcaAttrezzatura = "NEW-MARCA";
  fields.modelloAttrezzatura = "";

  const patch = schedaFieldsToAttrezzaturaPatch(fields, [
    "marcaAttrezzatura",
    "modelloAttrezzatura",
  ]);
  assert.equal(patch.marca, "NEW-MARCA");
  assert.equal(patch.modello, "—");

  console.log("apply-mezzo-patch-from-scheda-fields.test.ts OK");
}

run();
