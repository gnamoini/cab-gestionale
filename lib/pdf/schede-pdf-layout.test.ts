import assert from "node:assert/strict";
import {
  buildClienteMezzoPdfFields,
  buildLavorazioniPdfSections,
  buildRicambiPdfSections,
  pdfFieldsFromIdentificazioneLine,
} from "@/lib/pdf/schede-pdf-layout";
import type {
  LavorazioneSchedeBundle,
  SchedaIngressoDoc,
  SchedaLavorazioniDoc,
  SchedaRicambiDoc,
} from "@/types/schede";

const meta = {
  createdAt: "2026-05-24T10:00:00.000Z",
  updatedAt: "2026-05-24T12:00:00.000Z",
  createdBy: "Mario",
  updatedBy: "Luigi",
  sorgente: "generata" as const,
  fileEsterno: null,
};

const identLine = "Targa: AA111BB • Matricola: MAT-001 • Cliente: Acme Srl • Utilizzatore: Rossi";

const parsed = pdfFieldsFromIdentificazioneLine(identLine);
assert.equal(parsed.length, 4);
assert.equal(parsed[0]?.label, "Targa");
assert.equal(parsed[0]?.value, "AA111BB");
assert.equal(parsed.find((f) => f.label === "Cliente")?.value, "Acme Srl");
assert.deepEqual(pdfFieldsFromIdentificazioneLine(""), []);
assert.deepEqual(pdfFieldsFromIdentificazioneLine("  "), []);

const ingresso: SchedaIngressoDoc = {
  ...meta,
  tipo: "ingresso",
  campi: {
    dataIngresso: "24/05/2026",
    cliente: "Acme Srl",
    cantiere: "Cantiere Nord",
    utilizzatore: "Rossi",
    tipoAttrezzatura: "Escavatore",
    marcaAttrezzatura: "CAT",
    modelloAttrezzatura: "320",
    matricola: "MAT-001",
    nScuderia: "12",
    oreLavoro: "1500",
    tipoTelaio: "",
    marcaTelaio: "",
    modelloTelaio: "",
    targa: "AA111BB",
    km: "",
    descrizioneAnomalia: "",
    livelloCarburante: "",
    addettoAccettazione: "Angelo",
    richiedente: "",
    noteIntervento: "",
  },
};

const fromIngresso = buildClienteMezzoPdfFields(ingresso, identLine);
assert.equal(fromIngresso.cliente.length, 3);
assert.equal(fromIngresso.mezzo.length, 6);
assert.equal(fromIngresso.cliente[0]?.label, "Cliente");

const fromLine = buildClienteMezzoPdfFields(null, identLine);
assert.equal(fromLine.cliente.length, 2);
assert.equal(fromLine.mezzo.length, 2);
assert.equal(fromLine.mezzo.find((f) => f.label === "Targa")?.value, "AA111BB");

const bundle: LavorazioneSchedeBundle = {
  lavorazioneId: "LV-1024",
  ingresso,
  lavorazioni: null,
  ricambi: null,
};

const lavDoc: SchedaLavorazioniDoc = {
  ...meta,
  tipo: "lavorazioni",
  campi: {
    identificazioneMacchina: identLine,
    righe: [
      {
        id: "r1",
        dataLavorazione: "24/05/2026",
        lavorazioniEffettuate: "Sostituzione guarnizione",
        addettiAssegnati: [
          { addetto: "Luigi", oreImpiegate: 2 },
          { addetto: "Marco", oreImpiegate: 1.5 },
        ],
      },
    ],
  },
};

const lavSections = buildLavorazioniPdfSections(lavDoc, bundle, identLine);
assert.equal(lavSections.cliente.length, 3);
assert.equal(lavSections.interventi.oreTotale, 3.5);
assert.equal(lavSections.interventi.body[0]?.[2], "Luigi (2h)\nMarco (1.5h)");
assert.equal(lavSections.riepilogo[0]?.value, "3.50");

const ricDoc: SchedaRicambiDoc = {
  ...meta,
  tipo: "ricambi",
  campi: {
    identificazioneMacchina: identLine,
    righe: [
      {
        id: "x1",
        ricambioId: "rid1",
        ricambioNome: "Guarnizione",
        codice: "G-001",
        quantita: 2,
        addetto: "Luigi",
        dataUtilizzo: "24/05/2026",
        scaricoMagazzinoApplicato: true,
      },
      {
        id: "x2",
        ricambioId: null,
        ricambioNome: "Filtro",
        codice: "F-002",
        quantita: 1,
        addetto: "Marco",
        dataUtilizzo: "24/05/2026",
      },
    ],
  },
};

const ricSections = buildRicambiPdfSections(ricDoc, bundle, identLine);
assert.equal(ricSections.articoli.numRighe, 2);
assert.equal(ricSections.articoli.totalePezzi, 3);
assert.equal(ricSections.articoli.body[0]?.[5], "Scaricato");
assert.equal(ricSections.articoli.body[1]?.[5], "—");
assert.equal(ricSections.riepilogo.find((f) => f.label === "Totale pezzi")?.value, "3");
assert.equal(ricSections.riepilogo.find((f) => f.label === "Righe")?.value, "2");

console.log("schede-pdf-layout.test.ts OK");
