import assert from "node:assert/strict";
import { buildIngressoPdfSections } from "@/lib/pdf/ingresso-pdf-layout";
import type { SchedaIngressoFields } from "@/types/schede";

const fullCampi: SchedaIngressoFields = {
  dataIngresso: "2026-05-24",
  cliente: "Cliente Test",
  cantiere: "Cantiere A",
  utilizzatore: "Mario Rossi",
  tipoAttrezzatura: "Escavatore",
  marcaAttrezzatura: "CAT",
  modelloAttrezzatura: "320",
  matricola: "MAT-001",
  nScuderia: "12",
  oreLavoro: "1500",
  tipoTelaio: "Gommati",
  marcaTelaio: "CAT",
  modelloTelaio: "320 GC",
  targa: "AA111BB",
  km: "12000",
  descrizioneAnomalia: "Perdita olio idraulico",
  livelloCarburante: "3/4",
  addettoAccettazione: "Angelo",
  richiedente: "Capo cantiere",
  noteIntervento: "Verificare anche filtri",
};

const sections = buildIngressoPdfSections(fullCampi);

assert.equal(sections.data.length, 2);
assert.equal(sections.cliente.length, 4);
assert.equal(sections.attrezzatura.length, 6);
assert.equal(sections.telaio.length, 6);
assert.equal(sections.altreInformazioni.length, 2);
assert.equal(sections.attrezzatura[0]?.label, "Tipo");
assert.equal(sections.telaio.find((f) => f.label === "Carburante")?.value, "3/4");

const sparse = buildIngressoPdfSections({
  ...fullCampi,
  cliente: "",
  cantiere: "  ",
  descrizioneAnomalia: "",
  noteIntervento: "Solo note",
});

assert.equal(sparse.cliente.length, 2);
assert.deepEqual(
  sparse.altreInformazioni.map((f) => f.label),
  ["Note intervento"],
);

console.log("ingresso-pdf-layout.test.ts OK");
