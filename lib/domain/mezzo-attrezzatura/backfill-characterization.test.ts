import assert from "node:assert/strict";
import {
  buildMezzoTelaioBackfillFromRow,
  mapLegacyMezzoToAttrezzatura,
  defaultLavorazioneTarget,
} from "@/lib/domain/mezzo-attrezzatura/backfill-rules";

const legacyRow = {
  id: "m-1",
  marca: "Bobcat",
  modello: "E35",
  matricola: "MX123",
  tipo_attrezzatura: "Escavatore",
  anno: 2019,
  targa: "AB123CD",
  meta: {
    marcaTelaio: "Iveco",
    modelloTelaio: "Daily",
    tipoTelaio: "Furgone",
    km: 45000,
  },
};

const att = mapLegacyMezzoToAttrezzatura(legacyRow);
assert.equal(att.mezzo_id, "m-1");
assert.equal(att.marca, "Bobcat");
assert.equal(att.matricola, "MX123");

const telaio = buildMezzoTelaioBackfillFromRow(legacyRow);
assert.equal(telaio.marca_telaio, "Iveco");
assert.equal(telaio.km, 45000);

const target = defaultLavorazioneTarget("att-1");
assert.equal(target.target_type, "attrezzatura");
assert.equal(target.attrezzatura_id, "att-1");

console.log("backfill-characterization: ok");
