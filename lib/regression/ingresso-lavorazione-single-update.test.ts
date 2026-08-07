import assert from "node:assert/strict";
import {
  applyMezzoIdImmutabilityGuard,
  buildEditLavorazionePatchFromUpsert,
  mergeLavorazionePatches,
} from "@/lib/domain/intervento-context/build-edit-lavorazione-patch";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

const row: LavorazioneListRow = {
  id: "lav-1",
  mezzo_id: "mezzo-a",
  attrezzatura_id: null,
  target_type: "telaio",
  stato: "accettazione",
  priorita: "media",
  data_ingresso: "2026-01-01",
  data_uscita: null,
  note: "old",
  created_by: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  mezzo: null,
};

const fields = {
  dataIngresso: "02/01/2026",
  cliente: "C",
  cantiere: "",
  utilizzatore: "",
  tipoAttrezzatura: "",
  marcaAttrezzatura: "",
  modelloAttrezzatura: "",
  matricola: "",
  nScuderia: "99",
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
};

const sagaPatch = buildEditLavorazionePatchFromUpsert(row, fields, {
  mezzoId: "mezzo-a",
  targetType: "telaio",
  attrezzaturaId: null,
});

const consolidated = { note: "new note" };
const merged = mergeLavorazionePatches(sagaPatch, consolidated);

assert.ok(merged.data_ingresso);
assert.match(String(merged.data_ingresso), /^2026-01-02/);
assert.equal(merged.note, "new note");
assert.equal(Object.keys(merged).length, 2);

const guarded = applyMezzoIdImmutabilityGuard(
  row,
  mergeLavorazionePatches({ mezzo_id: "mezzo-b" }, { note: "x" }),
  false,
);
assert.equal(guarded.mezzo_id, undefined);
assert.equal(guarded.note, "x");

const allowed = applyMezzoIdImmutabilityGuard(
  row,
  { mezzo_id: "mezzo-b", note: "x" },
  true,
);
assert.equal(allowed.mezzo_id, "mezzo-b");

console.log("ingresso-lavorazione-single-update.test.ts: ok");
