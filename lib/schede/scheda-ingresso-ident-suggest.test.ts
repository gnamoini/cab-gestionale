import assert from "node:assert/strict";
import {
  findExactMezzoForIngressoIdent,
  findMezzoMatchForIngressoIdentField,
  mezzoIngressoSuggestLabel,
  mezzoIngressoSuggestSecondaryLabel,
  suggestMezziForIngressoIdent,
} from "@/lib/schede/scheda-ingresso-ident-suggest";
import { mergeSchedaIngressoFields } from "@/lib/schede/scheda-ingresso-reuse";
import { buildSchedaIngressoFieldsFromMezzo } from "@/lib/schede/scheda-ingresso-mezzo-autofill";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

const mezzoA: MezzoGestito = {
  id: "m1",
  cliente: "Cliente A",
  utilizzatore: "Mario",
  marca: "CAT",
  modello: "320",
  targa: "AB123CD",
  matricola: "MX-001",
  tipoAttrezzatura: "Escavatore",
  anno: 2020,
  oreKm: 1200,
  statoAttuale: "operativo",
  dataUltimaUscita: "",
  note: "",
  priorita: "normale",
};

const mezzoB: MezzoGestito = {
  ...mezzoA,
  id: "m2",
  targa: "ZZ999ZZ",
  matricola: "MX-999",
};

{
  const hits = suggestMezziForIngressoIdent([mezzoA, mezzoB], "targa", "ab12");
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.id, "m1");
}

{
  const hit = findExactMezzoForIngressoIdent([mezzoA, mezzoB], "matricola", "mx-001", {});
  assert.equal(hit?.id, "m1");
}

{
  const current: SchedaIngressoFields = {
    dataIngresso: "01/01/2026",
    cliente: "Già compilato",
    cantiere: "",
    utilizzatore: "",
    tipoAttrezzatura: "",
    marcaAttrezzatura: "",
    modelloAttrezzatura: "",
    matricola: "MX-001",
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
  };
  const merged = mergeSchedaIngressoFields(current, buildSchedaIngressoFieldsFromMezzo(mezzoA));
  assert.equal(merged.cliente, "Già compilato");
  assert.equal(merged.marcaAttrezzatura, "CAT");
  assert.equal(merged.targa, "AB123CD");
}

{
  assert.equal(
    mezzoIngressoSuggestLabel(mezzoA),
    "CAT 320 · Targa AB123CD · Matr. MX-001",
  );
  assert.equal(
    mezzoIngressoSuggestSecondaryLabel(mezzoA, "targa"),
    "Cliente A · CAT 320 · Matr. MX-001",
  );
  assert.equal(
    mezzoIngressoSuggestSecondaryLabel(mezzoA, "matricola"),
    "Cliente A · CAT 320 · Targa AB123CD",
  );
}

const mezzoVin: MezzoGestito = {
  ...mezzoA,
  id: "m3",
  vin: "WDB12345678901234",
  targa: "",
  matricola: "",
};

{
  const hits = suggestMezziForIngressoIdent([mezzoA, mezzoVin], "vin", "wdb123");
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.id, "m3");
}

{
  const hit = findExactMezzoForIngressoIdent([mezzoA, mezzoVin], "vin", "WDB12345678901234", {});
  assert.equal(hit?.id, "m3");
}

{
  const mezzoPlaceholder: MezzoGestito = {
    ...mezzoA,
    id: "m-dash",
    marca: "—",
    modello: "—",
    targa: "FY109RX",
    matricola: "—",
  };
  assert.equal(mezzoIngressoSuggestLabel(mezzoPlaceholder), "Targa FY109RX");
}

const mezzoSpacedTarga: MezzoGestito = {
  ...mezzoA,
  id: "m-spaced",
  targa: "HB 440 PC",
  matricola: "SP-001",
};

{
  const exact = findMezzoMatchForIngressoIdentField([mezzoA], "targa", "AB123CD");
  assert.equal(exact.kind, "exact");
  assert.equal(exact.mezzo?.id, "m1");
}

{
  const spacedExact = findMezzoMatchForIngressoIdentField([mezzoSpacedTarga], "targa", "HB440PC");
  assert.equal(spacedExact.kind, "exact");
  assert.equal(spacedExact.mezzo?.id, "m-spaced");
}

{
  const similar = findMezzoMatchForIngressoIdentField([mezzoA], "targa", "AB124CD");
  assert.equal(similar.kind, "similar");
  assert.equal(similar.mezzo?.id, "m1");
}

{
  const excluded = findMezzoMatchForIngressoIdentField([mezzoA], "targa", "AB123CD", {
    excludeMezzoId: "m1",
  });
  assert.equal(excluded.kind, "none");
}

{
  const vinExact = findMezzoMatchForIngressoIdentField([mezzoVin], "vin", "WDB12345678901234");
  assert.equal(vinExact.kind, "exact");
  assert.equal(vinExact.mezzo?.id, "m3");
}

{
  const vinPartial = findMezzoMatchForIngressoIdentField([mezzoVin], "vin", "WDB123");
  assert.equal(vinPartial.kind, "none");
}

console.log("scheda-ingresso-ident-suggest.test.ts: ok");
