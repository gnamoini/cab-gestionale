import assert from "node:assert/strict";
import { test } from "node:test";
import {
  anagraficaFromSchedaIngresso,
  mergeAnagraficaPreventivo,
  preventivoToSchedaIngressoSlice,
  schedaIngressoSliceToPreventivoPatch,
  syncMacchinaRiassunto,
} from "@/lib/preventivi/preventivo-anagrafica-map";
import {
  buildPreventivoAttrezzaturaPdfFields,
  buildPreventivoTelaioMezzoPdfFields,
} from "@/lib/pdf/anagrafica-pdf-fields";
import type { PreventivoRecord } from "@/lib/preventivi/types";

test("anagraficaFromSchedaIngresso mappa tutti i campi ingresso", () => {
  const patch = anagraficaFromSchedaIngresso({
    dataIngresso: "01/01/2026",
    cliente: "AMIU",
    cantiere: "Adelfia",
    utilizzatore: "Prova",
    tipoAttrezzatura: "Escavatore",
    marcaAttrezzatura: "CAT",
    modelloAttrezzatura: "320",
    matricola: "676767",
    nScuderia: "8778",
    oreLavoro: "1200",
    tipoTelaio: "Gomma",
    marcaTelaio: "Iveco",
    modelloTelaio: "Daily",
    vin: "",
    targa: "AB123CD",
    km: "45000",
    descrizioneAnomalia: "",
    livelloCarburante: "1/2",
    addettoAccettazione: "",
    richiedente: "Mario Rossi",
    noteIntervento: "",
  });
  assert.equal(patch.cliente, "AMIU");
  assert.equal(patch.tipoAttrezzatura, "Escavatore");
  assert.equal(patch.marcaTelaio, "Iveco");
  assert.equal(patch.km, "45000");
  assert.equal(patch.richiedente, "Mario Rossi");
  assert.equal(patch.livelloCarburante, "50%");
  assert.equal(patch.macchinaRiassunto, "CAT 320");
});

test("syncMacchinaRiassunto da marca e modello attrezzatura", () => {
  assert.equal(
    syncMacchinaRiassunto({ marcaAttrezzatura: "AMS", modelloAttrezzatura: "X1", macchinaRiassunto: "" }),
    "AMS X1",
  );
});

test("preventivo roundtrip slice → patch", () => {
  const base = {
    cliente: "A",
    cantiere: "B",
    utilizzatore: "C",
    macchinaRiassunto: "CAT 320",
    targa: "T1",
    matricola: "M1",
    nScuderia: "S1",
    marcaAttrezzatura: "CAT",
    modelloAttrezzatura: "320",
    tipoAttrezzatura: "Escavatore",
    oreLavoro: "100",
    tipoTelaio: "Gomma",
    marcaTelaio: "Iveco",
    modelloTelaio: "Daily",
    km: "1000",
    livelloCarburante: "Pieno",
    richiedente: "Req",
    targetType: "attrezzatura",
    attrezzaturaId: "att-1",
  } as PreventivoRecord;
  const slice = preventivoToSchedaIngressoSlice(base);
  assert.equal(slice.targetType, "attrezzatura");
  assert.equal(slice.attrezzaturaId, "att-1");
  const patch = schedaIngressoSliceToPreventivoPatch({ ...slice, km: "2000" });
  assert.equal(patch.km, "2000");
  assert.equal(patch.tipoTelaio, "Gomma");
  assert.equal(patch.targetType, "attrezzatura");
  assert.equal(patch.attrezzaturaId, "att-1");
});

test("PDF attrezzatura e telaio completi da record esteso", () => {
  const p = {
    cliente: "X",
    tipoAttrezzatura: "Escavatore",
    marcaAttrezzatura: "CAT",
    modelloAttrezzatura: "320",
    matricola: "676767",
    nScuderia: "8778",
    oreLavoro: "1200",
    tipoTelaio: "Gomma",
    marcaTelaio: "Iveco",
    modelloTelaio: "Daily",
    vin: "",
    targa: "AB123CD",
    km: "45000",
    livelloCarburante: "1/2",
    macchinaRiassunto: "CAT 320",
  } as PreventivoRecord;

  const att = buildPreventivoAttrezzaturaPdfFields(p);
  assert.ok(att.some((f) => f.label === "Tipo" && f.value === "Escavatore"));
  assert.ok(att.some((f) => f.label === "Ore lavoro" && f.value === "1200"));

  const tel = buildPreventivoTelaioMezzoPdfFields(p);
  assert.ok(tel.some((f) => f.label === "Marca" && f.value === "Iveco"));
  assert.ok(tel.some((f) => f.label === "KM" && f.value === "45000"));
  assert.ok(tel.some((f) => f.label === "Carburante" && f.value === "50%"));
});

test("mergeAnagraficaPreventivo priorità ingresso su mezzo", () => {
  const merged = mergeAnagraficaPreventivo(
    { cliente: "Da ingresso", targa: "ING1", matricola: "", cantiere: "", utilizzatore: "", tipoAttrezzatura: "", marcaAttrezzatura: "", modelloAttrezzatura: "", nScuderia: "", oreLavoro: "", tipoTelaio: "", marcaTelaio: "", modelloTelaio: "", km: "", descrizioneAnomalia: "", livelloCarburante: "", addettoAccettazione: "", richiedente: "",
    richiedenteTelefono: "", noteIntervento: "", dataIngresso: "" },
    {
      id: "m1",
      cliente: "Da mezzo",
      utilizzatore: "U",
      marca: "M",
      modello: "Mod",
      targa: "MEZ1",
      matricola: "MAT",
      tipoAttrezzatura: "Tipo",
      anno: 2020,
      oreKm: 0,
      statoAttuale: "Ok",
      dataUltimaUscita: "",
      note: "",
      priorita: "normale",
    },
    null,
  );
  assert.equal(merged.cliente, "Da ingresso");
  assert.equal(merged.targa, "ING1");
});
