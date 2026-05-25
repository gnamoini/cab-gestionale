import assert from "node:assert/strict";
import { buildSchedaPdfDownloadFileName, schedaTipoToPdfSlug } from "@/lib/schede/scheda-pdf-filename";
import type { SchedaIngressoDoc } from "@/types/schede";

const ingressoDoc: SchedaIngressoDoc = {
  tipo: "ingresso",
  createdAt: "2026-01-23T10:00:00.000Z",
  updatedAt: "2026-01-23T10:00:00.000Z",
  createdBy: "Op",
  updatedBy: "Op",
  sorgente: "generata",
  fileEsterno: null,
  campi: {
    dataIngresso: "23/01/2026",
    cliente: "Test",
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
    targa: "",
    km: "",
    descrizioneAnomalia: "",
    livelloCarburante: "",
    addettoAccettazione: "",
    richiedente: "",
    noteIntervento: "",
  },
};

assert.equal(schedaTipoToPdfSlug("ingresso"), "scheda-ingresso");
assert.equal(schedaTipoToPdfSlug("lavorazioni"), "scheda-lavorazione");
assert.equal(schedaTipoToPdfSlug("ricambi"), "scheda-ricambi");

assert.equal(
  buildSchedaPdfDownloadFileName({ doc: ingressoDoc, lavorazioneId: "LV-1024", codiceLavorazione: "26-0001" }),
  "scheda-ingresso_26-0001_2026-01-23.pdf",
);

assert.equal(
  buildSchedaPdfDownloadFileName({ doc: ingressoDoc, lavorazioneId: "LV-1024" }),
  "scheda-ingresso_LV-1024_2026-01-23.pdf",
);

assert.equal(
  buildSchedaPdfDownloadFileName({ doc: ingressoDoc, lavorazioneId: "", titoloScheda: "Scheda ingresso" }),
  "scheda-ingresso_2026-01-23.pdf",
);

console.log("scheda-pdf-filename.test.ts: ok");
